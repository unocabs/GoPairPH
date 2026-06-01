import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderWishlistLeadNotificationEmail, makeWishlistLeadRequestTitle, makeWishlistLeadSizeLabel } from '@/lib/email/wishlistLeadNotification';
import { sendEmail } from '@/lib/email/resend';
import { offerSchema } from '@/lib/validations';
import { verifyTurnstile } from '@/lib/turnstile';

const bodySchema = z.object({
  data: offerSchema,
  turnstileToken: z.string().min(1, 'Missing captcha token'),
});

interface RouteContext {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteContext) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request body';
    return NextResponse.json({ error: message ?? 'Invalid request body' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const ok = await verifyTurnstile(parsed.turnstileToken, ip);
  if (!ok) {
    return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 400 });
  }

  // Authenticated callers get their profile attached. shoe_id, if supplied,
  // must belong to that profile — anyone could otherwise attribute a stranger's
  // listing to themselves. Admins can attach any active Go Pair PH listing.
  let offererProfileId: string | null = null;
  let offererIsAdmin = false;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
    offererProfileId = prof?.id ?? null;
    offererIsAdmin = !!prof?.is_admin;
  }

  const service = createServiceClient();
  let shoeId: string | null = null;
  if (parsed.data.shoe_id) {
    if (!offererProfileId) {
      return NextResponse.json({ error: 'You must be logged in to attach a listing.' }, { status: 401 });
    }
    const { data: shoe } = await service
      .from('shoes')
      .select('id, seller_id, status')
      .eq('id', parsed.data.shoe_id)
      .single();
    if (!shoe || shoe.status !== 'active') {
      return NextResponse.json({ error: 'That listing is no longer active.' }, { status: 400 });
    }
    if (!offererIsAdmin && shoe.seller_id !== offererProfileId) {
      return NextResponse.json({ error: "That listing isn't yours to attach." }, { status: 403 });
    }
    shoeId = shoe.id;
  }

  // Make sure the pair request still exists.
  const { data: existing } = await service
    .from('wishlist_items')
    .select('id, user_id, brand, model, color, size_eu, size_us, size_cm, us_size_type')
    .eq('id', params.id)
    .single();
  if (!existing) {
    return NextResponse.json({ error: 'Pair request not found' }, { status: 404 });
  }

  const { data: inserted, error: insertErr } = await service
    .from('wishlist_offers')
    .insert({
      wishlist_id: params.id,
      url: parsed.data.url,
      price_php: parsed.data.price_php ?? null,
      note: parsed.data.note?.trim() || null,
      offerer_id: offererProfileId,
      shoe_id: shoeId,
    })
    .select('*, profiles(id, display_name, avatar_url)')
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'Failed to add offer' }, { status: 400 });
  }

  let notification: LeadNotificationResult = { status: 'skipped_unknown' };
  try {
    notification = await sendLeadNotification({
      service,
      request: existing,
      offer: inserted,
    });
  } catch (error) {
    console.error('[wishlist-offers] lead notification email failed:', error);
    notification = { status: 'failed', reason: error instanceof Error ? error.message : 'Unknown email error' };
  }

  return NextResponse.json({ ...inserted, notification }, { status: 201 });
}

type LeadNotificationResult =
  | { status: 'sent'; recipient: string }
  | { status: 'skipped_unknown' }
  | { status: 'skipped_no_owner' }
  | { status: 'skipped_throttled'; recentLeadCount: number }
  | { status: 'skipped_no_email' }
  | { status: 'failed'; reason: string };

async function sendLeadNotification({
  service,
  request,
  offer,
}: {
  service: ReturnType<typeof createServiceClient>;
  request: {
    id: string;
    user_id: string | null;
    brand: string;
    model: string;
    color: string | null;
    size_eu: number | null;
    size_us: number | null;
    size_cm: number | null;
    us_size_type: string | null;
  };
  offer: {
    url: string;
    price_php: number | null;
    note: string | null;
    profiles?: { display_name?: string | null } | null;
  };
}): Promise<LeadNotificationResult> {
  if (!request.user_id) return { status: 'skipped_no_owner' };

  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count: recentLeadCount } = await service
    .from('wishlist_offers')
    .select('id', { count: 'exact', head: true })
    .eq('wishlist_id', request.id)
    .gte('created_at', thirtyMinutesAgo);
  if ((recentLeadCount ?? 0) > 1) {
    return { status: 'skipped_throttled', recentLeadCount: recentLeadCount ?? 0 };
  }

  const { data: ownerProfile } = await service
    .from('profiles')
    .select('user_id')
    .eq('id', request.user_id)
    .single();
  if (!ownerProfile?.user_id) return { status: 'skipped_no_email' };

  const { data: ownerAuth } = await service.auth.admin.getUserById(ownerProfile.user_id);
  const ownerEmail = ownerAuth.user?.email;
  if (!ownerEmail) return { status: 'skipped_no_email' };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const requestUrl = `${siteUrl}/looking-for?item=${encodeURIComponent(request.id)}`;
  const requestTitle = makeWishlistLeadRequestTitle({
    brand: request.brand,
    model: request.model,
    color: request.color,
  });
  const sizeLabel = makeWishlistLeadSizeLabel({
    sizeEu: request.size_eu,
    sizeUs: request.size_us,
    sizeCm: request.size_cm,
    usSizeType: request.us_size_type,
  });

  await sendEmail({
    to: ownerEmail,
    subject: `New lead for your Looking For post — ${requestTitle}`,
    html: renderWishlistLeadNotificationEmail({
      requestTitle,
      requestUrl,
      leadUrl: offer.url,
      leadPricePhp: offer.price_php,
      leadNote: offer.note,
      offererName: offer.profiles?.display_name ?? null,
      sizeLabel,
    }),
  });
  return { status: 'sent', recipient: ownerEmail };
}
