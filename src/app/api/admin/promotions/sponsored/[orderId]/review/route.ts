import { NextResponse } from 'next/server';
import { renderSellerSponsoredReviewEmail } from '@/lib/email/sponsoredPromotion';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';
import type { SponsoredPromotionOrder } from '@/types';

export const runtime = 'nodejs';

interface RequestBody {
  action?: 'approve' | 'reject' | 'refund_required';
  notes?: string;
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  return profile?.is_admin ? profile : null;
}

export async function PATCH(request: Request, { params }: { params: { orderId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as RequestBody;
  if (body.action !== 'approve' && body.action !== 'reject' && body.action !== 'refund_required') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_review_sponsored_promotion', {
    p_order_id: params.orderId,
    p_action: body.action,
    p_notes: body.notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const order = data as SponsoredPromotionOrder;

  if (body.action === 'approve' || body.action === 'reject') {
    const service = createServiceClient();
    const { data: listingData } = await service
      .from('shoes')
      .select('id, slug, brand, model, seller_id, profiles!shoes_seller_id_fkey(user_id)')
      .eq('id', order.listing_id)
      .maybeSingle();
    const listing = listingData as {
      id: string;
      slug: string | null;
      brand: string;
      model: string;
      seller_id: string;
      profiles?: { user_id: string } | { user_id: string }[] | null;
    } | null;

    const sellerProfile = Array.isArray(listing?.profiles) ? listing?.profiles[0] : listing?.profiles;
    const sellerUserId = sellerProfile?.user_id;
    if (listing && sellerUserId) {
      try {
        const { data: authData } = await service.auth.admin.getUserById(sellerUserId);
        if (authData.user?.email) {
          const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
          const listingName = formatListingName(listing.brand, listing.model);
          await sendTransactionalEmail({
            category: 'sponsored_promotion',
            to: authData.user.email,
            subject: body.action === 'approve'
              ? `Your Top Pick is approved: ${listingName}`
              : `Top Pick request needs review: ${listingName}`,
            html: renderSellerSponsoredReviewEmail({
              listingName,
              listingUrl: getAbsoluteListingUrl(siteUrl, listing),
              sellerName: 'Go Pair PH seller',
              durationDays: order.duration_days,
              pricePhp: order.price_php,
              scheduledStartAt: order.scheduled_start_at,
              scheduledEndAt: order.scheduled_end_at,
              approved: body.action === 'approve',
              notes: body.notes ?? null,
            }),
          });
        }
      } catch (emailError) {
        console.error('[sponsored-promotion] seller review email failed', emailError);
      }
    }
  }

  return NextResponse.json({ order });
}
