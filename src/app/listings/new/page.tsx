export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import type { Shop } from '@/types';

async function getProfileAndShop(): Promise<{ profileId: string; shop: Shop | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return null;
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();
  return { profileId: profile.id, shop: (shop as Shop) ?? null };
}

export default async function NewListingPage() {
  const result = await getProfileAndShop();
  if (!result) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">List a Shoe</h1>
      <p className="text-sm text-gray-500 mb-8">
        {result.shop
          ? `Posting as ${result.shop.name}.`
          : 'Share your running shoes with the Pampanga running community.'}
      </p>
      <AuthGuard>
        <ListingForm profileId={result.profileId} shop={result.shop} />
      </AuthGuard>
    </div>
  );
}
