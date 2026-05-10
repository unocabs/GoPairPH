export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShopDashboard } from './ShopDashboard';
import type { Shoe, Shop } from '@/types';

async function loadShopDashboardData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .maybeSingle();
  if (!shop) return null;

  const { data: listings } = await supabase
    .from('shoes')
    .select('id, brand, model, status, shoe_images(*)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(120);

  return {
    shop: shop as Shop,
    listings: (listings as Pick<Shoe, 'id' | 'brand' | 'model' | 'status' | 'shoe_images'>[]) ?? [],
  };
}

export default async function ShopDashboardPage() {
  const data = await loadShopDashboardData();
  if (!data) redirect('/profile');

  return <ShopDashboard shop={data.shop} listings={data.listings} />;
}
