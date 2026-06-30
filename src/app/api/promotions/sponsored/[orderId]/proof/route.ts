import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { renderAdminSponsoredProofEmail, renderSellerSponsoredSubmittedEmail } from '@/lib/email/sponsoredPromotion';
import {
  getAdminEmails,
  proofPathBelongsToUser,
  SPONSORED_PAYMENT_PROOF_BUCKET,
} from '@/lib/sponsoredPromotions';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';
import type { SponsoredPaymentMethod, SponsoredPromotionOrder } from '@/types';

export const runtime = 'nodejs';

interface RequestBody {
  paymentMethod?: SponsoredPaymentMethod;
  transactionReference?: string;
  proofStoragePath?: string;
}

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const body = await request.json().catch(() => ({})) as RequestBody;
  if (body.paymentMethod !== 'gcash' && body.paymentMethod !== 'bpi') {
    return NextResponse.json({ error: 'Choose GCash or BPI.' }, { status: 400 });
  }
  if (!body.proofStoragePath?.trim()) {
    return NextResponse.json({ error: 'Payment proof screenshot is required.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!proofPathBelongsToUser(body.proofStoragePath, user.id)) {
    return NextResponse.json({ error: 'Invalid proof path.' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('submit_sponsored_payment_proof', {
    p_order_id: params.orderId,
    p_payment_method: body.paymentMethod,
    p_transaction_reference: body.transactionReference?.trim() || null,
    p_proof_storage_path: body.proofStoragePath,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const order = data as SponsoredPromotionOrder;
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
  const listingName = listing ? formatListingName(listing.brand, listing.model) : 'Top Pick listing';
  const listingUrl = listing ? getAbsoluteListingUrl(siteUrl, listing) : `${siteUrl}/profile`;
  const adminUrl = `${siteUrl}/admin?tab=promotions`;
  const sellerProfile = Array.isArray(listing?.profiles) ? listing?.profiles[0] : listing?.profiles;
  const sellerName = sellerProfile?.display_name ?? 'Go Pair PH seller';

  let proofUrl: string | null = null;
  if (order.proof_storage_path) {
    const { data: signed } = await service.storage
      .from(SPONSORED_PAYMENT_PROOF_BUCKET)
      .createSignedUrl(order.proof_storage_path, 60 * 60 * 24 * 7);
    proofUrl = signed?.signedUrl ?? null;
  }

  try {
    const admins = await getAdminEmails(service);
    if (admins.length > 0) {
      await sendTransactionalEmail({
        category: 'sponsored_promotion',
        to: admins,
        subject: `Top Pick proof submitted: ${listingName}`,
        html: renderAdminSponsoredProofEmail({
          listingName,
          listingUrl,
          sellerName,
          durationDays: order.duration_days,
          pricePhp: order.price_php,
          paymentMethod: order.payment_method,
          transactionReference: order.transaction_reference,
          proofUrl,
          status: order.status.replaceAll('_', ' '),
          scheduledStartAt: order.scheduled_start_at,
          scheduledEndAt: order.scheduled_end_at,
          adminUrl,
        }),
      });
    }
  } catch (emailError) {
    console.error('[sponsored-promotion] admin email failed', emailError);
  }

  try {
    if (user.email) {
      await sendTransactionalEmail({
        category: 'sponsored_promotion',
        to: user.email,
        subject: `Your Top Pick request was received: ${listingName}`,
        html: renderSellerSponsoredSubmittedEmail({
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
    console.error('[sponsored-promotion] seller email failed', emailError);
  }

  return NextResponse.json({ order });
}
