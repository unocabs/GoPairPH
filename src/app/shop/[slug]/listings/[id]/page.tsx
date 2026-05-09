export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// The canonical listing detail page lives at /listings/[id] and already
// renders the shop logo overlay + "Sold by <Shop>" badge when the listing
// belongs to an active shop. Validate that this listing actually belongs to
// this shop, then redirect — keeps a single detail UI in v1.
export default async function ShopListingDetailPage({ params }: { params: { slug: string; id: string } }) {
  const supabase = createClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .maybeSingle();
  if (!shop) notFound();

  const { data: shoe } = await supabase
    .from('shoes')
    .select('id, shop_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!shoe || shoe.shop_id !== shop.id) notFound();

  redirect(`/listings/${params.id}`);
}
