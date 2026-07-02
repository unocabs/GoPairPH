import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { BUYBACK_DELIVERY_CHECKS } from '@/lib/buyback';
import { renderBuybackLifecycleEmail } from '@/lib/email/buybackOffer';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';
import { copyBuybackInventoryPhotos } from '@/lib/buybackInventory';

const schema = z.object({
  action: z.enum(['delivered', 'complete', 'dispute']),
  note: z.string().trim().max(1500).optional().nullable(),
  cod_paid_php: z.number().positive().optional().nullable(),
  delivery_checklist: z.record(z.string(), z.boolean()).optional().default({}),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the fulfillment fields.' }, { status: 400 });
  if (parsed.data.action === 'complete' && !BUYBACK_DELIVERY_CHECKS.every(([key]) => parsed.data.delivery_checklist[key] === true)) {
    return NextResponse.json({ error: 'Complete every delivery check.' }, { status: 400 });
  }
  if (parsed.data.action === 'dispute' && !parsed.data.note) return NextResponse.json({ error: 'Add a dispute note.' }, { status: 400 });

  const { data, error } = await supabase.rpc('admin_fulfill_buyback_offer', {
    p_offer_id: params.id,
    p_action: parsed.data.action,
    p_note: parsed.data.note ?? null,
    p_cod_paid_php: parsed.data.cod_paid_php ?? null,
    p_delivery_checklist: parsed.data.delivery_checklist,
  });
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed.' }, { status: 400 });

  let inventory = null;
  if (parsed.data.action === 'complete') {
    try {
      const service = createServiceClient();
      const { data: item } = await service.from('buyback_inventory_items').select('id').eq('offer_id', params.id).single();
      if (item) inventory = await copyBuybackInventoryPhotos(item.id, null);
    } catch (copyError) {
      console.error('[buyback/fulfillment] inventory photo copy failed:', copyError);
    }
  }

  if (parsed.data.action === 'complete' || parsed.data.action === 'dispute') {
    try {
      const service = createServiceClient();
      const { data: offer } = await service.from('buyback_offers').select('quoted_price_php, seller:profiles!seller_id(user_id, display_name), listing:shoes!listing_id(id, slug, brand, model)').eq('id', params.id).single();
      const sellerRaw = offer?.seller as unknown;
      const listingRaw = offer?.listing as unknown;
      const seller = (Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw) as { user_id: string; display_name: string } | null;
      const listing = (Array.isArray(listingRaw) ? listingRaw[0] : listingRaw) as { id: string; slug: string; brand: string; model: string } | null;
      if (seller && listing) {
        const { data: auth } = await service.auth.admin.getUserById(seller.user_id);
        if (auth.user?.email) {
          const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
          const title = formatListingName(listing.brand, listing.model);
          await sendTransactionalEmail({
            category: 'buyback_offer', to: auth.user.email,
            subject: parsed.data.action === 'complete' ? `Buyback completed — ${title}` : `Buyback delivery needs review — ${title}`,
            html: renderBuybackLifecycleEmail({
              sellerName: seller.display_name,
              listingTitle: title,
              quoteLabel: formatPrice(offer?.quoted_price_php ?? 0),
              listingUrl: `${siteUrl}${getListingPath(listing)}`,
              status: parsed.data.action === 'complete' ? 'completed' : 'disputed',
              note: parsed.data.note,
            }),
          });
        }
      }
    } catch (emailError) {
      console.error('[buyback/fulfillment] email failed:', emailError);
    }
  }
  return NextResponse.json({ offer: data, inventory });
}
