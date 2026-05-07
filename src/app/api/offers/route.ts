import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderOfferEmail } from '@/lib/email/offerNotification';
import { sendOfferEmail } from '@/lib/email/resend';
import { formatCondition, formatListingName, formatSize } from '@/lib/utils';

const bodySchema = z.object({
  listing_id: z.string().uuid(),
  message: z.string().trim().max(2000).optional().nullable(),
  offer_price_php: z.number().positive().finite().optional().nullable(),
});

function formatPesos(amount: number | null): string {
  if (amount == null) return '0';
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(amount);
}

export async function POST(request: Request) {
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

  const { listing_id, message, offer_price_php } = parsed;

  const { data: buyerProfileRow, error: buyerProfileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (buyerProfileErr || !buyerProfileRow) {
    return NextResponse.json({ error: 'Buyer profile not found' }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('purchase_requests')
    .insert({
      listing_id,
      buyer_id: buyerProfileRow.id,
      message: message?.trim() || null,
      offer_price_php: offer_price_php ?? null,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to create offer' },
      { status: 400 }
    );
  }

  // Email is best-effort. Failures are logged; the API still reports success.
  try {
    await sendNotification({
      buyerId: user.id,
      listingId: listing_id,
      message: message?.trim() || null,
      offerPricePhp: offer_price_php ?? null,
    });
  } catch (err) {
    console.error('[offers] notification email failed:', err);
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}

interface NotificationArgs {
  buyerId: string;
  listingId: string;
  message: string | null;
  offerPricePhp: number | null;
}

async function sendNotification({ buyerId, listingId, message, offerPricePhp }: NotificationArgs) {
  const service = createServiceClient();

  const { data: listing, error: listingErr } = await service
    .from('shoes')
    .select('id, brand, model, size_eu, size_us, size_cm, condition, mileage_km, price_php, seller_id')
    .eq('id', listingId)
    .single();
  if (listingErr || !listing) throw new Error(`listing fetch failed: ${listingErr?.message}`);

  const { data: sellerProfile, error: sellerErr } = await service
    .from('profiles')
    .select('id, user_id, display_name')
    .eq('id', listing.seller_id)
    .single();
  if (sellerErr || !sellerProfile) throw new Error(`seller profile fetch failed: ${sellerErr?.message}`);

  const { data: buyerProfile } = await service
    .from('profiles')
    .select('display_name')
    .eq('user_id', buyerId)
    .single();

  const { data: sellerAuth, error: sellerAuthErr } = await service.auth.admin.getUserById(sellerProfile.user_id);
  if (sellerAuthErr || !sellerAuth?.user?.email) {
    throw new Error(`seller email lookup failed: ${sellerAuthErr?.message ?? 'no email on auth user'}`);
  }
  const sellerEmail = sellerAuth.user.email;

  const listingTitle = formatListingName(listing.brand, listing.model);
  const offerAmount = offerPricePhp ?? listing.price_php ?? 0;
  const listedPrice = listing.price_php ?? 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  const offerLink = `${siteUrl}/profile`;

  const html = renderOfferEmail({
    seller_name: sellerProfile.display_name,
    listing_title: listingTitle,
    shoe_size: formatSize(listing.size_eu, listing.size_us, listing.size_cm) || '—',
    condition: formatCondition(listing.condition),
    mileage: listing.mileage_km != null ? `${listing.mileage_km} km` : 'Mileage not specified',
    offer_amount: formatPesos(offerAmount),
    listed_price: formatPesos(listedPrice),
    buyer_name: buyerProfile?.display_name ?? 'A Go Pair PH runner',
    buyer_message: message,
    offer_link: offerLink,
  });

  await sendOfferEmail({
    to: sellerEmail,
    subject: `New offer on ${listingTitle} — Go Pair PH`,
    html,
  });
}
