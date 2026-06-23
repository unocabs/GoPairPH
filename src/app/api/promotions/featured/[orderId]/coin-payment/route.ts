import { NextResponse } from 'next/server';
import { renderAdminFeaturedProofEmail, renderSellerFeaturedSubmittedEmail } from '@/lib/email/featuredPromotion';
import { sendEmail } from '@/lib/email/resend';
import { getAdminEmails } from '@/lib/featuredPromotions';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';
import type { FeaturedPromotionOrder } from '@/types';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: { orderId: string } }) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.rpc('submit_featured_coin_payment', {
    p_order_id: params.orderId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const order = data as FeaturedPromotionOrder;
  const service = createServiceClient();
  const { data: listingData } = await service
    .from('shoes')
    .select('id, slug, brand, model, seller_id, profiles!shoes_seller_id_fkey(display_name, user_id)')
    .eq('id', order.listing_id)
    .maybeSingle();
  const listing = listingData as {
    id: string;
    slug: string | null;
    brand: string;
    model: string;
    seller_id: string;
    profiles?: { display_name: string | null; user_id: string } | { display_name: string | null; user_id: string }[] | null;
  } | null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const listingName = listing ? formatListingName(listing.brand, listing.model) : 'Featured listing';
  const listingUrl = listing ? getAbsoluteListingUrl(siteUrl, listing) : `${siteUrl}/profile`;
  const adminUrl = `${siteUrl}/admin?tab=promotions`;
  const sellerProfile = Array.isArray(listing?.profiles) ? listing?.profiles[0] : listing?.profiles;
  const sellerName = sellerProfile?.display_name ?? 'Go Pair PH seller';

  try {
    const admins = await getAdminEmails(service);
    if (admins.length > 0) {
      await sendEmail({
        to: admins,
        subject: `Featured paid with GP Coins: ${listingName}`,
        html: renderAdminFeaturedProofEmail({
          listingName,
          listingUrl,
          sellerName,
          durationDays: order.duration_days,
          pricePhp: order.price_php,
          paymentMethod: null,
          transactionReference: 'GP Coin-only payment',
          proofUrl: null,
          queuePosition: order.queue_position,
          status: order.status.replaceAll('_', ' '),
          scheduledStartAt: order.scheduled_start_at,
          scheduledEndAt: order.scheduled_end_at,
          coinsUsed: order.coins_used,
          coinDiscountPhp: order.coin_discount_php,
          cashAmountPhp: order.cash_amount_php,
          paymentMode: order.coin_payment_mode.replaceAll('_', ' '),
          adminUrl,
        }),
      });
    }
  } catch (emailError) {
    console.error('[featured-promotion] coin-only admin email failed', emailError);
  }

  try {
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `Your Featured request is approved: ${listingName}`,
        html: renderSellerFeaturedSubmittedEmail({
          listingName,
          listingUrl,
          sellerName,
          durationDays: order.duration_days,
          pricePhp: order.price_php,
          scheduledStartAt: order.scheduled_start_at,
          scheduledEndAt: order.scheduled_end_at,
        }),
      });
    }
  } catch (emailError) {
    console.error('[featured-promotion] coin-only seller email failed', emailError);
  }

  return NextResponse.json({ order });
}
