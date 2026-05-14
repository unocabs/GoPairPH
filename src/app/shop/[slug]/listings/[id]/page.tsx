export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getListingPath } from '@/lib/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    .select('id, slug, shop_id')
    .eq(UUID_RE.test(params.id) ? 'id' : 'slug', params.id)
    .maybeSingle();
  if (!shoe || shoe.shop_id !== shop.id) notFound();

  redirect(getListingPath(shoe));
}
