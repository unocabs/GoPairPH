import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderOfferEmail, renderShopOrderEmail, renderDonationRequestEmail } from '@/lib/email/offerNotification';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatCondition, formatListingName, formatMileage, formatSize } from '@/lib/utils';

const bodySchema = z.object({
  listing_id: z.string().uuid(),
  message: z.string().trim().max(2000).optional().nullable(),
  offer_price_php: z.number().positive().finite().optional().nullable(),
  variant_id: z.string().uuid().optional().nullable(),
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

  const { listing_id, message, offer_price_php, variant_id } = parsed;

  const { data: buyerProfileRow, error: buyerProfileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (buyerProfileErr || !buyerProfileRow) {
    return NextResponse.json({ error: 'Buyer profile not found' }, { status: 400 });
  }

  const { data: listing, error: listingErr } = await supabase
    .from('shoes')
    .select('id, seller_id, shop_id, status, has_stock, inventory_mode')
    .eq('id', listing_id)
    .single();

  if (listingErr || !listing) {
    return NextResponse.json({ error: 'Listing not found or unavailable' }, { status: 404 });
  }

  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'This listing is no longer available.' }, { status: 400 });
  }

  if (listing.seller_id === buyerProfileRow.id) {
    return NextResponse.json({ error: 'You cannot place an order on your own listing.' }, { status: 400 });
  }

  if (listing.shop_id && listing.inventory_mode === 'multi') {
    if (!variant_id) {
      return NextResponse.json({ error: 'Please choose a size before placing your order.' }, { status: 400 });
    }

    const { data: variant, error: variantErr } = await supabase
      .from('shoe_variants')
      .select('id, shoe_id, quantity')
      .eq('id', variant_id)
      .single();

    if (variantErr || !variant || variant.shoe_id !== listing.id) {
      return NextResponse.json({ error: 'The selected size is no longer available for this listing.' }, { status: 400 });
    }

    if (variant.quantity <= 0 || !listing.has_stock) {
      return NextResponse.json({ error: 'The selected size is out of stock.' }, { status: 400 });
    }
  } else if (variant_id) {
    return NextResponse.json({ error: 'Size selection is only available for multiple-stock shop listings.' }, { status: 400 });
  } else if (!listing.has_stock) {
    return NextResponse.json({ error: 'This shoe is no longer available.' }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('purchase_requests')
    .insert({
      listing_id,
      buyer_id: buyerProfileRow.id,
      message: message?.trim() || null,
      offer_price_php: offer_price_php ?? null,
      variant_id: variant_id ?? null,
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
      variantId: variant_id ?? null,
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
  variantId: string | null;
}

async function sendNotification({ buyerId, listingId, message, offerPricePhp, variantId }: NotificationArgs) {
  const service = createServiceClient();

  const { data: listing, error: listingErr } = await service
    .from('shoes')
    .select('id, brand, model, size_eu, size_us, size_cm, us_size_type, condition, mileage_km, price_php, listing_type, seller_id, shop_id, shops(name)')
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

  // Free Shoes listings: lighter template, no price talk.
  if (listing.listing_type === 'donate') {
    const html = renderDonationRequestEmail({
      donor_name: sellerProfile.display_name,
      listing_title: listingTitle,
      shoe_size: formatSize(listing.size_eu, listing.size_us, listing.size_cm, listing.us_size_type) || '—',
      condition: formatCondition(listing.condition),
      requester_name: buyerProfile?.display_name ?? 'A Go Pair PH runner',
      requester_message: message,
      request_link: offerLink,
    });
    await sendTransactionalEmail({
      category: 'marketplace_offer',
      to: sellerEmail,
      subject: `New free pair request: ${listingTitle} — Go Pair PH`,
      html,
    });
    return;
  }

  if (listing.shop_id) {
    let selectedSize = formatSize(listing.size_eu, listing.size_us, listing.size_cm, listing.us_size_type) || 'Selected size';
    if (variantId) {
      const { data: variant } = await service
        .from('shoe_variants')
        .select('size_eu, size_us, size_cm, us_size_type')
        .eq('id', variantId)
        .maybeSingle();
      if (variant) selectedSize = formatSize(variant.size_eu, variant.size_us, variant.size_cm, variant.us_size_type) || selectedSize;
    }

    const shop = Array.isArray(listing.shops) ? listing.shops[0] : listing.shops;
    const html = renderShopOrderEmail({
      shop_name: shop?.name ?? sellerProfile.display_name,
      listing_title: listingTitle,
      selected_size: selectedSize,
      listed_price: formatPesos(listedPrice),
      buyer_name: buyerProfile?.display_name ?? 'A Go Pair PH buyer',
      buyer_message: message,
      order_link: offerLink,
    });

    await sendTransactionalEmail({
      category: 'marketplace_order',
      to: sellerEmail,
      subject: `New shop order: ${listingTitle} — Go Pair PH`,
      html,
    });
    return;
  }

  const html = renderOfferEmail({
    seller_name: sellerProfile.display_name,
    listing_title: listingTitle,
    shoe_size: formatSize(listing.size_eu, listing.size_us, listing.size_cm, listing.us_size_type) || '—',
    condition: formatCondition(listing.condition),
    mileage: formatMileage(listing.mileage_km),
    offer_amount: formatPesos(offerAmount),
    listed_price: formatPesos(listedPrice),
    buyer_name: buyerProfile?.display_name ?? 'A Go Pair PH runner',
    buyer_message: message,
    offer_link: offerLink,
  });

  await sendTransactionalEmail({
    category: 'marketplace_offer',
    to: sellerEmail,
    subject: `New offer on ${listingTitle} — Go Pair PH`,
    html,
  });
}
