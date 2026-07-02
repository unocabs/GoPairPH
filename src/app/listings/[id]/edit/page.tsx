export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditListingForm } from './EditListingForm';
import type { Shoe } from '@/types';

async function getShoeForEdit(id: string): Promise<{ shoe: Shoe; profileId: string; canChangeStockMode: boolean } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
  if (!profile) return null;

  let query = supabase
    .from('shoes')
    .select('*, shoe_variants(*), shoe_images(*)')
    .eq('id', id);
  if (!profile.is_admin) query = query.eq('seller_id', profile.id);
  const { data: shoe } = await query.single();
  if (!shoe) return null;

  const { count: buyerRequestCount } = await supabase
    .from('purchase_requests')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', shoe.id);

  return {
    shoe: shoe as Shoe,
    profileId: profile.id,
    canChangeStockMode: !!shoe.shop_id && shoe.status === 'active' && !shoe.inspected_by_go_pair_at && (buyerRequestCount ?? 0) === 0,
  };
}

export default async function EditListingPage({ params, searchParams }: { params: { id: string }; searchParams?: { renew?: string } }) {
  const result = await getShoeForEdit(params.id);
  if (!result) redirect('/');
  const renewAfterSave = searchParams?.renew === '1';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-8">Edit Listing</h1>
      <EditListingForm shoe={result.shoe} renewAfterSave={renewAfterSave} canChangeStockMode={result.canChangeStockMode} />
    </div>
  );
}
