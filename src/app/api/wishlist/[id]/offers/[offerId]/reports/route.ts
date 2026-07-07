import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/turnstile';
import { getAdminNotificationEmails, renderAdminActionEmail } from '@/lib/email/adminNotifications';
import { sendTransactionalEmail } from '@/lib/email/resend';

export const runtime = 'nodejs';

const reportReasons = [
  'unavailable_or_sold',
  'price_changed',
  'wrong_item',
  'broken_link',
  'spam_or_duplicate',
  'other',
] as const;

const bodySchema = z.object({
  reason: z.enum(reportReasons),
  note: z.string().max(500, 'Note must be 500 characters or less.').optional().nullable(),
  turnstileToken: z.string().min(1, 'Missing captcha token'),
});

interface RouteContext {
  params: {
    id: string;
    offerId: string;
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  let parsed: z.infer<typeof bodySchema>;
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

  let reporterId: string | null = null;
  let reporterName: string | null = null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    reporterId = profile?.id ?? null;
    reporterName = profile?.display_name ?? null;
  }

  const service = createServiceClient();
  const { data: offer } = await service
    .from('wishlist_offers')
    .select('id, wishlist_id, url, price_php, note')
    .eq('id', params.offerId)
    .eq('wishlist_id', params.id)
    .single();

  if (!offer) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const { data: report, error } = await service
    .from('wishlist_offer_reports')
    .insert({
      offer_id: params.offerId,
      wishlist_id: params.id,
      reason: parsed.reason,
      note: parsed.note?.trim() || null,
      reporter_id: reporterId,
    })
    .select('id')
    .single();

  if (error || !report) {
    return NextResponse.json({ error: error?.message ?? 'Failed to report lead.' }, { status: 400 });
  }

  try {
    const [admins, { data: item }] = await Promise.all([
      getAdminNotificationEmails(service),
      service.from('wishlist_items').select('brand, model').eq('id', offer.wishlist_id).maybeSingle(),
    ]);
    if (admins.length > 0) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      const requestName = [item?.brand, item?.model].filter(Boolean).join(' ') || 'Looking For request';
      await sendTransactionalEmail({
        category: 'admin_notification',
        to: admins,
        subject: `Looking For lead reported: ${requestName}`,
        html: renderAdminActionEmail({
          title: 'New Looking For lead report',
          intro: 'A submitted lead was reported and needs admin review.',
          rows: [
            { label: 'Request', value: requestName },
            { label: 'Reason', value: parsed.reason.replaceAll('_', ' ') },
            { label: 'Reporter', value: reporterName ?? (user?.email || 'Anonymous visitor') },
            { label: 'Lead URL', value: offer.url },
            { label: 'Lead price', value: offer.price_php == null ? null : `PHP ${Number(offer.price_php).toLocaleString('en-PH')}` },
          ],
          note: parsed.note?.trim() || offer.note,
          adminUrl: `${siteUrl}/admin?tab=leadReports`,
          buttonLabel: 'Review lead report',
        }),
        tags: { notification: 'wishlist_lead_report' },
      });
    }
  } catch (emailError) {
    console.error('[wishlist-offer-reports] admin email failed', emailError);
  }

  return NextResponse.json({ id: report.id }, { status: 201 });
}
