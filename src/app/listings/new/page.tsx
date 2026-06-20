export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { ListingV2Form } from '@/components/listings/v2/ListingV2Form';
import { ListingV2Intro } from '@/components/listings/v2/ListingV2Intro';
import { ListingV2ShareStep } from '@/components/listings/v2/ListingV2ShareStep';
import type { Profile, Shoe, Shop } from '@/types';

interface NewListingContext {
  profile: Profile;
  shop: Shop | null;
}

async function getContext(): Promise<NewListingContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (!profile) return null;
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();
  return { profile: profile as Profile, shop: (shop as Shop | null) ?? null };
}

async function getOwnedShareListing(listingId: string, profileId: string): Promise<Shoe | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(*), shops(*), shoe_images(*), shoe_variants(*)')
    .eq('id', listingId)
    .eq('seller_id', profileId)
    .maybeSingle();
  return (data as Shoe | null) ?? null;
}

export default async function NewListingPage({ searchParams }: { searchParams?: { share?: string; resume?: string } }) {
  const context = await getContext();
  const shareListing = searchParams?.share && context
    ? await getOwnedShareListing(searchParams.share, context.profile.id)
    : null;

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.10),transparent_34%)] px-4 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto mb-3 flex w-full max-w-2xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">Create a listing</p>
        </div>
        {!shareListing && <ListingV2Intro />}
      </div>

      {searchParams?.share ? (
        shareListing && context ? (
          <ListingV2ShareStep shoe={shareListing} seller={context.profile} />
        ) : (
          <div className="mx-auto max-w-lg rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-sm text-amber-100">
            This listing could not be opened for sharing. Make sure you are signed in as its seller.
          </div>
        )
      ) : (
        <ListingV2Form
          profileId={context?.profile.id ?? null}
          initialLocationCity={context?.profile.location_city ?? null}
          shop={searchParams?.resume === 'draft' ? null : context?.shop ?? null}
        />
      )}
    </main>
  );
}
