import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { BUYBACK_PRE_ACCEPTANCE_CHECKS } from '@/lib/buyback';
import { renderBuybackAcceptedEmail, renderBuybackDeclinedEmail } from '@/lib/email/buybackOffer';
import { renderRequestStatusChangeEmail } from '@/lib/email/offerNotification';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';

const schema = z.object({
  action: z.enum(['accept', 'decline']),
  checklist: z.record(z.string(), z.boolean()).optional().default({}),
  admin_note: z.string().trim().max(1500).optional().nullable(),
  decline_reason: z.string().trim().max(120).optional().nullable(),
  recipient_name: z.string().trim().max(120).optional().nullable(),
  recipient_phone: z.string().trim().max(40).optional().nullable(),
  recipient_address: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the review fields.' }, { status: 400 });
  if (parsed.data.action === 'accept' && !BUYBACK_PRE_ACCEPTANCE_CHECKS.every(([key]) => parsed.data.checklist[key] === true)) {
    return NextResponse.json({ error: 'Complete every review check before accepting.' }, { status: 400 });
  }
  if (parsed.data.action === 'decline' && (!parsed.data.decline_reason || !parsed.data.admin_note)) {
    return NextResponse.json({ error: 'Choose a reason and add a note.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: before } = await service
    .from('buyback_offers')
    .select('*, listing:shoes!listing_id(id, slug, brand, model, price_php, seller_id, profiles!shoes_seller_id_fkey(display_name)), seller:profiles!seller_id(user_id, display_name)')
    .eq('id', params.id)
    .single();
  if (!before) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
  const { data: pendingBuyers } = parsed.data.action === 'accept'
    ? await service.from('purchase_requests').select('id, buyer_id, offer_price_php').eq('listing_id', before.listing_id).eq('status', 'pending')
    : { data: [] };

  const { data: reviewed, error } = await supabase.rpc('admin_review_buyback_offer', {
    p_offer_id: params.id,
    p_action: parsed.data.action,
    p_checklist: parsed.data.checklist,
    p_admin_note: parsed.data.admin_note ?? null,
    p_decline_reason: parsed.data.decline_reason ?? null,
    p_recipient_name: parsed.data.recipient_name ?? null,
    p_recipient_phone: parsed.data.recipient_phone ?? null,
    p_recipient_address: parsed.data.recipient_address ?? null,
  });
  if (error || !reviewed) return NextResponse.json({ error: error?.message ?? 'Review failed.' }, { status: 400 });

  try {
    const listingRaw = before.listing as unknown;
    const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as { id: string; slug: string; brand: string; model: string; price_php: number; profiles?: { display_name?: string } | { display_name?: string }[] };
    const sellerRaw = before.seller as unknown;
    const seller = (Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw) as { user_id: string; display_name: string };
    const { data: sellerAuth } = await service.auth.admin.getUserById(seller.user_id);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
    const listingUrl = `${siteUrl}${getListingPath(listing)}`;
    if (sellerAuth.user?.email) {
      const common = {
        sellerName: seller.display_name,
        listingTitle: formatListingName(listing.brand, listing.model),
        quoteLabel: formatPrice(before.quoted_price_php),
        listingUrl,
      };
      const html = parsed.data.action === 'accept'
        ? renderBuybackAcceptedEmail({
            ...common,
            shipDate: before.proposed_ship_date,
            recipientName: parsed.data.recipient_name!,
            recipientPhone: parsed.data.recipient_phone!,
            recipientAddress: parsed.data.recipient_address!,
            adminNote: parsed.data.admin_note,
          })
        : renderBuybackDeclinedEmail({ ...common, reason: parsed.data.decline_reason!, adminNote: parsed.data.admin_note! });
      await sendTransactionalEmail({
        category: 'buyback_offer', to: sellerAuth.user.email,
        subject: parsed.data.action === 'accept' ? `Your Go Pair PH offer was accepted — ${common.listingTitle}` : `Update on your Go Pair PH offer — ${common.listingTitle}`,
        html,
      });
    }

    if (parsed.data.action === 'accept') {
      const sellerProfileRaw = listing.profiles;
      const listingSeller = Array.isArray(sellerProfileRaw) ? sellerProfileRaw[0] : sellerProfileRaw;
      for (const buyerRequest of pendingBuyers ?? []) {
        const { data: buyer } = await service.from('profiles').select('user_id, display_name').eq('id', buyerRequest.buyer_id).single();
        if (!buyer) continue;
        const { data: auth } = await service.auth.admin.getUserById(buyer.user_id);
        if (!auth.user?.email) continue;
        await sendTransactionalEmail({
          category: 'request_status',
          to: auth.user.email,
          subject: `Update on your request — ${formatListingName(listing.brand, listing.model)}`,
          html: renderRequestStatusChangeEmail({
            buyer_name: buyer.display_name,
            listing_title: formatListingName(listing.brand, listing.model),
            seller_name: listingSeller?.display_name ?? 'The seller',
            status: 'declined',
            price_label: formatPrice(listing.price_php),
            request_link: listingUrl,
            messenger_link: null,
            seller_message: 'The listing is now reserved for another transaction.',
          }),
        });
      }
    }
  } catch (emailError) {
    console.error('[buyback/review] notification failed:', emailError);
  }

  return NextResponse.json({ offer: reviewed });
}
