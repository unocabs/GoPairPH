export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditListingForm } from './EditListingForm';
import type { Shoe } from '@/types';

async function getShoeForEdit(id: string): Promise<{ shoe: Shoe; profileId: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return null;

  const { data: shoe } = await supabase
    .from('shoes')
    .select('*, shoe_variants(*), shoe_images(*)')
    .eq('id', id)
    .eq('seller_id', profile.id)
    .single();
  if (!shoe) return null;

  return { shoe: shoe as Shoe, profileId: profile.id };
}

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const result = await getShoeForEdit(params.id);
  if (!result) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-8">Edit Listing</h1>
      <EditListingForm shoe={result.shoe} />
    </div>
  );
}
