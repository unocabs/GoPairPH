import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderRequestStatusChangeEmail } from '@/lib/email/offerNotification';
import { sendOfferEmail } from '@/lib/email/resend';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';
import { buildMessengerUrl } from '@/lib/facebook';

const bodySchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

interface RouteContext {
  params: { id: string };
}

// Seller-only endpoint to flip a purchase request to accepted/declined.
// Wraps the existing RPC + direct update so we can fire a buyer notification email.
export async function POST(request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Resolve caller's profile.
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  // Pull request + listing using service role so we can email the buyer's auth email after.
  const service = createServiceClient();
  const { data: req, error: reqErr } = await service
    .from('purchase_requests')
    .select('id, buyer_id, listing_id, status, listing:shoes!listing_id(id, slug, brand, model, price_php, listing_type, seller_id, profiles(display_name, fb_username))')
    .eq('id', params.id)
    .single();
  if (reqErr || !req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Listing select returns the related shoe; sometimes as array via PostgREST conventions.
  const listing = Array.isArray(req.listing) ? req.listing[0] : req.listing;
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Only the listing owner may accept/decline.
  if (listing.seller_id !== callerProfile.id) {
    return NextResponse.json({ error: 'Only the seller can change this request.' }, { status: 403 });
  }

  // Perform the status change. Accept goes through the existing RPC so reservation logic
  // (set listing to reserved, etc) stays consistent.
  if (parsed.status === 'accepted') {
    const { error: rpcErr } = await supabase.rpc('accept_purchase_request', { p_request_id: params.id });
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });
  } else {
    const { error: updErr } = await supabase
      .from('purchase_requests')
      .update({ status: 'declined' })
      .eq('id', params.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  // Best-effort: email the buyer. Failures don't roll back the status change.
  try {
    const { data: buyerProfile } = await service
      .from('profiles')
      .select('user_id, display_name')
      .eq('id', req.buyer_id)
      .single();
    if (!buyerProfile) throw new Error('buyer profile missing');

    const { data: buyerAuth } = await service.auth.admin.getUserById(buyerProfile.user_id);
    const buyerEmail = buyerAuth?.user?.email;
    if (!buyerEmail) throw new Error('buyer email missing');

    const sellerProfile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
    const sellerName = sellerProfile?.display_name ?? 'The seller';
    const fbUsername = sellerProfile?.fb_username ?? null;

    const listingTitle = formatListingName(listing.brand, listing.model);
    const priceLabel = listing.listing_type === 'donate'
      ? 'Free'
      : (listing.price_php != null ? formatPrice(listing.price_php) : 'See listing');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
    const requestLink = `${siteUrl}${getListingPath({ id: listing.id, slug: listing.slug })}`;
    const messengerLink = parsed.status === 'accepted' ? buildMessengerUrl(fbUsername) : null;

    const html = renderRequestStatusChangeEmail({
      buyer_name: buyerProfile.display_name ?? 'Runner',
      listing_title: listingTitle,
      seller_name: sellerName,
      status: parsed.status,
      price_label: priceLabel,
      request_link: requestLink,
      messenger_link: messengerLink,
    });

    const subject = parsed.status === 'accepted'
      ? `${sellerName} accepted your request — ${listingTitle}`
      : `Update on your request — ${listingTitle}`;

    await sendOfferEmail({ to: buyerEmail, subject, html });
  } catch (err) {
    console.error('[purchase-requests/status] buyer notification failed:', err);
  }

  return NextResponse.json({ ok: true });
}
