import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { toSellerBuybackOffer } from '@/lib/buyback';
import type { BuybackOffer } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { data: profile } = await service.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 400 });
  const { data: current } = await service.from('buyback_offers').select('*').eq('id', params.id).eq('seller_id', profile.id).single();
  if (!current) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    if (current.status !== 'accepted') return NextResponse.json({ error: 'This offer is not ready for shipping.' }, { status: 400 });
    if (current.expires_at && new Date(current.expires_at).getTime() < Date.now()) {
      await service.rpc('reconcile_expired_buyback_offers');
      return NextResponse.json({ error: 'This accepted offer has expired. Refresh the listing for the latest status.' }, { status: 400 });
    }
    const form = await request.formData();
    const trackingNumber = String(form.get('tracking_number') ?? '').trim();
    const booking = form.get('booking_confirmation');
    if (!/^[A-Za-z0-9-]{6,40}$/.test(trackingNumber)) {
      return NextResponse.json({ error: 'Enter a valid J&T tracking number.' }, { status: 400 });
    }
    if (!(booking instanceof File) || booking.size === 0 || booking.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(booking.type)) {
      return NextResponse.json({ error: 'Upload the J&T booking confirmation (JPG, PNG, WebP, or PDF under 8 MB).' }, { status: 400 });
    }
    const ext = booking.type === 'application/pdf' ? 'pdf' : booking.type === 'image/png' ? 'png' : booking.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${profile.id}/${params.id}/booking_confirmation.${ext}`;
    const { error: uploadError } = await service.storage.from('buyback-proofs').upload(path, new Uint8Array(await booking.arrayBuffer()), { contentType: booking.type, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

    const { error: proofError } = await service.from('buyback_offer_proofs').upsert({
      offer_id: params.id,
      kind: 'booking_confirmation',
      storage_path: path,
      original_name: booking.name,
      mime_type: booking.type,
    }, { onConflict: 'offer_id,kind' });
    if (proofError) return NextResponse.json({ error: proofError.message }, { status: 400 });

    const { data: updated, error } = await service.from('buyback_offers').update({
      status: 'shipped', tracking_number: trackingNumber, shipped_at: new Date().toISOString(),
    }).eq('id', params.id).eq('status', 'accepted').select('*').single();
    if (error || !updated) return NextResponse.json({ error: error?.message ?? 'Could not mark the offer shipped.' }, { status: 400 });
    await service.from('buyback_offer_events').insert({
      offer_id: params.id, actor_profile_id: profile.id, event_type: 'shipped', metadata: { tracking_number: trackingNumber },
    });
    return NextResponse.json({ offer: toSellerBuybackOffer(updated as BuybackOffer) });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action !== 'cancel') return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  const { data, error } = await supabase.rpc('cancel_buyback_offer', { p_offer_id: params.id });
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not cancel the offer.' }, { status: 400 });
  return NextResponse.json({ offer: toSellerBuybackOffer(data as BuybackOffer) });
}
