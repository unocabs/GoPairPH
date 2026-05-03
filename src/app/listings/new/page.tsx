export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ListingForm } from '@/components/listings/ListingForm';

async function getProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export default async function NewListingPage() {
  const profileId = await getProfileId();
  if (!profileId) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">List a Shoe</h1>
      <p className="text-sm text-gray-500 mb-8">Share your running shoes with the Pampanga running community.</p>
      <AuthGuard>
        <ListingForm profileId={profileId} />
      </AuthGuard>
    </div>
  );
}
