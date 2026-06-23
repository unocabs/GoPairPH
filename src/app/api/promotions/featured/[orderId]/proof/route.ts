import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { renderAdminFeaturedProofEmail, renderSellerFeaturedSubmittedEmail } from '@/lib/email/featuredPromotion';
import {
  FEATURED_PAYMENT_PROOF_BUCKET,
  getAdminEmails,
  proofPathBelongsToUser,
} from '@/lib/featuredPromotions';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';
import type { FeaturedPaymentMethod, FeaturedPromotionOrder } from '@/types';

export const runtime = 'nodejs';

interface RequestBody {
  paymentMethod?: FeaturedPaymentMethod;
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

  const { data, error } = await supabase.rpc('submit_featured_payment_proof', {
    p_order_id: params.orderId,
    p_payment_method: body.paymentMethod,
    p_transaction_reference: body.transactionReference?.trim() || null,
    p_proof_storage_path: body.proofStoragePath,
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

  let proofUrl: string | null = null;
  if (order.proof_storage_path) {
    const { data: signed } = await service.storage
      .from(FEATURED_PAYMENT_PROOF_BUCKET)
      .createSignedUrl(order.proof_storage_path, 60 * 60 * 24 * 7);
    proofUrl = signed?.signedUrl ?? null;
  }

  try {
    const admins = await getAdminEmails(service);
    if (admins.length > 0) {
      await sendEmail({
        to: admins,
        subject: `Featured proof submitted: ${listingName}`,
        html: renderAdminFeaturedProofEmail({
          listingName,
          listingUrl,
          sellerName,
          durationDays: order.duration_days,
          pricePhp: order.price_php,
          paymentMethod: order.payment_method,
          transactionReference: order.transaction_reference,
          proofUrl,
          queuePosition: order.queue_position,
          status: order.status.replaceAll('_', ' '),
          scheduledStartAt: order.scheduled_start_at,
          scheduledEndAt: order.scheduled_end_at,
          adminUrl,
        }),
      });
    }
  } catch (emailError) {
    console.error('[featured-promotion] admin email failed', emailError);
  }

  try {
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `Your Featured request was received: ${listingName}`,
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
    console.error('[featured-promotion] seller email failed', emailError);
  }

  return NextResponse.json({ order });
}
