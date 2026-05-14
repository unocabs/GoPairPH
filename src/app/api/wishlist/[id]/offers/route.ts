import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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
  // listing to themselves.
  let offererProfileId: string | null = null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    offererProfileId = prof?.id ?? null;
  }

  let shoeId: string | null = null;
  if (parsed.data.shoe_id) {
    if (!offererProfileId) {
      return NextResponse.json({ error: 'You must be logged in to attach a listing.' }, { status: 401 });
    }
    const service = createServiceClient();
    const { data: shoe } = await service
      .from('shoes')
      .select('id, seller_id')
      .eq('id', parsed.data.shoe_id)
      .single();
    if (!shoe || shoe.seller_id !== offererProfileId) {
      return NextResponse.json({ error: "That listing isn't yours to attach." }, { status: 403 });
    }
    shoeId = shoe.id;
  }

  // Make sure the pair request still exists.
  const service = createServiceClient();
  const { data: existing } = await service
    .from('wishlist_items')
    .select('id')
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

  return NextResponse.json(inserted, { status: 201 });
}
