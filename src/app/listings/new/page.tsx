export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingForm } from '@/components/listings/ListingForm';
import { SellerContactGate } from '@/components/listings/SellerContactGate';
import { CanListWidget } from '@/components/listings/CanListWidget';
import { formatPrice, formatRelativeDate, formatSize } from '@/lib/utils';
import { buildMessengerUrl, getFacebookContactUrl } from '@/lib/facebook';
import type { Shop, WishlistItem } from '@/types';

type DemandSignal = Pick<WishlistItem, 'id' | 'brand' | 'model' | 'size_eu' | 'size_us' | 'size_cm' | 'price_max_php' | 'location' | 'created_at'>;

async function getProfileAndShop(): Promise<{ profileId: string; fbUsername: string | null; shop: Shop | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, fb_username').eq('user_id', user.id).single();
  if (!profile) return null;
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .eq('status', 'active')
    .maybeSingle();
  return { profileId: profile.id, fbUsername: profile.fb_username ?? null, shop: (shop as Shop) ?? null };
}

async function getDemandSignals(): Promise<DemandSignal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select('id, brand, model, size_eu, size_us, size_cm, price_max_php, location, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (data as DemandSignal[]) ?? [];
}

export default async function NewListingPage({ searchParams }: { searchParams?: { resume?: string } }) {
  const [result, demandSignals] = await Promise.all([
    getProfileAndShop(),
    getDemandSignals(),
  ]);
  const isResumingGuestDraft = searchParams?.resume === 'draft';
  const formShop = isResumingGuestDraft ? null : result?.shop ?? null;
  const hasValidSellerContact = !!buildMessengerUrl(result?.fbUsername) || !!getFacebookContactUrl(formShop?.fb_page_url);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Sell your running shoes with one clean listing</h1>
      <p className="max-w-2xl text-sm leading-6 text-gray-500 mb-3">
        {formShop
          ? `Posting as ${formShop.name}.`
          : 'Add the important details, upload top and sole photos, then share your Go Pair PH listing to Facebook, Messenger, or running groups.'}
      </p>
      <div className="mb-8 flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-teal-200">About 2-3 minutes</span>
        <span className="rounded-full border border-white/[0.08] bg-slate-900/70 px-3 py-1">Clean share link</span>
        <span className="rounded-full border border-white/[0.08] bg-slate-900/70 px-3 py-1">FB-ready share image</span>
      </div>
      {result ? (
        <SellerContactGate
          profileId={result.profileId}
          initialFbUsername={result.fbUsername}
          hasShopContact={!!getFacebookContactUrl(formShop?.fb_page_url)}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <ListingForm profileId={result.profileId} shop={formShop} hasMessengerContact={hasValidSellerContact} />

            <aside className="space-y-4 lg:sticky lg:top-24 lg:pt-[100px]">
              <CanListWidget compact />

              <div className="rounded-xl border border-white/[0.08] bg-slate-950/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Buyer demand</p>
                <h2 className="mt-2 text-sm font-semibold text-gray-100">Recent pair requests</h2>

                {demandSignals.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {demandSignals.slice(0, 3).map((item) => {
                      const size = formatSize(item.size_eu, item.size_us, item.size_cm);
                      return (
                        <Link
                          key={item.id}
                          href={`/looking-for?item=${item.id}`}
                          className="block rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 transition-colors hover:border-teal-400/25 hover:bg-slate-900/60"
                        >
                          <p className="truncate text-xs font-semibold text-gray-200">{item.brand} {item.model}</p>
                          <p className="mt-0.5 truncate text-[11px] text-gray-500">
                            {size || 'Any size'}
                            {item.price_max_php ? ` · up to ${formatPrice(item.price_max_php)}` : ''}
                            {item.location ? ` · ${item.location}` : ''}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-600">{formatRelativeDate(item.created_at)}</p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-white/[0.1] bg-slate-950/35 p-3 text-xs text-gray-500">
                    No one&apos;s looking for shoes yet.
                  </div>
                )}

                <Link href="/looking-for" className="mt-3 inline-flex text-xs font-medium text-teal-300 hover:text-teal-200">
                  View demand board
                </Link>
              </div>
            </aside>
          </div>
        </SellerContactGate>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <ListingForm profileId={null} shop={null} />

          <aside className="space-y-4 lg:sticky lg:top-24 lg:pt-[100px]">
            <CanListWidget compact />

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">No account needed yet</p>
              <h2 className="mt-2 text-sm font-semibold text-gray-100">Start with the shoe details.</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                You can fill this out first. We&apos;ll ask you to sign in before photos so your listing draft can be safely published under your profile.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-slate-950/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Buyer demand</p>
              <h2 className="mt-2 text-sm font-semibold text-gray-100">Recent pair requests</h2>

              {demandSignals.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {demandSignals.slice(0, 3).map((item) => {
                    const size = formatSize(item.size_eu, item.size_us, item.size_cm);
                    return (
                      <Link
                        key={item.id}
                        href={`/looking-for?item=${item.id}`}
                        className="block rounded-lg border border-white/[0.08] bg-slate-950/45 px-3 py-2 transition-colors hover:border-teal-400/25 hover:bg-slate-900/60"
                      >
                        <p className="truncate text-xs font-semibold text-gray-200">{item.brand} {item.model}</p>
                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {size || 'Any size'}
                          {item.price_max_php ? ` · up to ${formatPrice(item.price_max_php)}` : ''}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-600">{formatRelativeDate(item.created_at)}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-white/[0.1] bg-slate-950/35 p-3 text-xs text-gray-500">
                  No one&apos;s looking for shoes yet.
                </div>
              )}

              <Link href="/looking-for" className="mt-3 inline-flex text-xs font-medium text-teal-300 hover:text-teal-200">
                View demand board
              </Link>
            </div>
          </aside>
        </div>
      )}
      </div>
    </div>
  );
}
