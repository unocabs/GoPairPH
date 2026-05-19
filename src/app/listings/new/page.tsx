export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ListingForm } from '@/components/listings/ListingForm';
import { SellerContactGate } from '@/components/listings/SellerContactGate';
import { CanListWidget } from '@/components/listings/CanListWidget';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { formatPrice, formatRelativeDate, formatSize } from '@/lib/utils';
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

export default async function NewListingPage() {
  const [result, demandSignals] = await Promise.all([
    getProfileAndShop(),
    getDemandSignals(),
  ]);
  if (!result) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">List a Shoe</h1>
      <p className="text-sm text-gray-500 mb-8">
        {result.shop
          ? `Posting as ${result.shop.name}.`
          : 'Share your running shoes with Pampanga buyers. Nearby sellers are welcome if they can meet, deliver, or ship.'}
      </p>
      <AuthGuard>
        <SellerContactGate
          profileId={result.profileId}
          initialFbUsername={result.fbUsername}
          hasShopContact={!!result.shop?.fb_page_url}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <ListingForm profileId={result.profileId} shop={result.shop} />

            <aside className="space-y-4 lg:sticky lg:top-24">
              <CanListWidget compact />

              <SurfaceCard glow className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Buyer demand</p>
                <h2 className="mt-2 text-lg font-bold text-gray-100">Runners are looking for these pairs</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  If you have a match, list it and share the clean link. Pair requests help sellers see what buyers already want.
                </p>

                {demandSignals.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {demandSignals.map((item) => {
                      const size = formatSize(item.size_eu, item.size_us, item.size_cm);
                      return (
                        <Link
                          key={item.id}
                          href={`/find-my-pair?item=${item.id}`}
                          className="block rounded-xl border border-white/[0.08] bg-slate-950/55 p-3 transition-colors hover:border-teal-400/35 hover:bg-slate-900/70"
                        >
                          <p className="text-sm font-semibold text-gray-100">{item.brand} {item.model}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {size || 'Any size'}
                            {item.price_max_php ? ` · up to ${formatPrice(item.price_max_php)}` : ''}
                            {item.location ? ` · ${item.location}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-600">{formatRelativeDate(item.created_at)}</p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] bg-slate-950/40 p-4 text-sm text-gray-500">
                    No active pair requests yet.
                  </div>
                )}

                <Link href="/find-my-pair" className="mt-4 block">
                  <Button variant="outline" size="sm" className="w-full">View Demand Board</Button>
                </Link>
              </SurfaceCard>
            </aside>
          </div>
        </SellerContactGate>
      </AuthGuard>
    </div>
  );
}
