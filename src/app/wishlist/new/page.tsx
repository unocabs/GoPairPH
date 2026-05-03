export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { WishlistForm } from '@/components/wishlist/WishlistForm';

async function getProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export default async function NewWishlistPage() {
  const profileId = await getProfileId();
  if (!profileId) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Post a Wishlist Item</h1>
      <p className="text-sm text-gray-500 mb-8">Let other runners know what shoe you&apos;re looking for.</p>
      <AuthGuard>
        <WishlistForm profileId={profileId} />
      </AuthGuard>
    </div>
  );
}
