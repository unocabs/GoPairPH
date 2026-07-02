import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderBuybackLifecycleEmail, renderBuybackShippingReminderEmail } from '@/lib/email/buybackOffer';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const service = createServiceClient();
  if (!cronAuthorized(request)) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const manilaTomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const { data: reminders } = await service
    .from('buyback_offers')
    .select('id, proposed_ship_date, quoted_price_php, seller:profiles!seller_id(user_id, display_name), listing:shoes!listing_id(id, slug, brand, model)')
    .eq('status', 'accepted')
    .is('shipping_reminder_sent_at', null)
    .lte('proposed_ship_date', manilaTomorrow)
    .gte('expires_at', now);
  const { data: expiring } = await service
    .from('buyback_offers')
    .select('id, quoted_price_php, seller:profiles!seller_id(user_id, display_name), listing:shoes!listing_id(id, slug, brand, model)')
    .eq('status', 'accepted')
    .lt('expires_at', now);
  const { data: count, error } = await service.rpc('reconcile_expired_buyback_offers');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const offer of expiring ?? []) {
    try {
      const sellerRaw = offer.seller as unknown;
      const listingRaw = offer.listing as unknown;
      const seller = (Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw) as { user_id: string; display_name: string } | null;
      const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as { id: string; slug: string; brand: string; model: string } | null;
      if (!seller || !listing) continue;
      const { data: auth } = await service.auth.admin.getUserById(seller.user_id);
      if (!auth.user?.email) continue;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      await sendTransactionalEmail({
        category: 'buyback_offer', to: auth.user.email,
        subject: `Buyback offer expired — ${formatListingName(listing.brand, listing.model)}`,
        html: renderBuybackLifecycleEmail({
          sellerName: seller.display_name,
          listingTitle: formatListingName(listing.brand, listing.model),
          quoteLabel: formatPrice(offer.quoted_price_php),
          listingUrl: `${siteUrl}${getListingPath(listing)}`,
          status: 'expired',
        }),
      });
    } catch (emailError) {
      console.error('[buyback/reconcile] expiry email failed:', emailError);
    }
  }
  let remindersSent = 0;
  for (const offer of reminders ?? []) {
    try {
      const sellerRaw = offer.seller as unknown;
      const listingRaw = offer.listing as unknown;
      const seller = (Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw) as { user_id: string; display_name: string } | null;
      const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as { id: string; slug: string; brand: string; model: string } | null;
      if (!seller || !listing) continue;
      const { data: auth } = await service.auth.admin.getUserById(seller.user_id);
      if (!auth.user?.email) continue;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      const title = formatListingName(listing.brand, listing.model);
      await sendTransactionalEmail({
        category: 'buyback_offer', to: auth.user.email,
        subject: `J&T shipping reminder — ${title}`,
        html: renderBuybackShippingReminderEmail({
          sellerName: seller.display_name,
          listingTitle: title,
          quoteLabel: formatPrice(offer.quoted_price_php),
          listingUrl: `${siteUrl}${getListingPath(listing)}`,
          shipDate: offer.proposed_ship_date,
        }),
      });
      await service.from('buyback_offers').update({ shipping_reminder_sent_at: new Date().toISOString() }).eq('id', offer.id).eq('status', 'accepted');
      remindersSent += 1;
    } catch (emailError) {
      console.error('[buyback/reconcile] reminder email failed:', emailError);
    }
  }
  return NextResponse.json({ expired: Number(count ?? 0), remindersSent });
}
