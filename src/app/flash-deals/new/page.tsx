import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { paymentUser } from '@/lib/payments/server';
import { createServiceClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { EndFlashDealButton, FlashDealForm, type FlashDealChoice } from '@/components/listings/FlashDealForm';
import { formatListingName, formatPrice, getListingPath, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { isFlashDealLive } from '@/lib/flashDeals';
import type { Shoe } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Start a Flash Deal', robots: { index: false, follow: false } };

export default async function NewFlashDealPage({ searchParams }: { searchParams: { listing?: string; sale?: string } }) {
  const auth = await paymentUser();
  if (!auth) redirect(`/auth/sign-in?next=${encodeURIComponent(`/flash-deals/new${searchParams.listing ? `?listing=${encodeURIComponent(searchParams.listing)}` : ''}`)}`);
  const service = createServiceClient();
  await service.rpc('gp_coin_expire_available', { p_profile_id: auth.profile.id });
  const [profileRes, listingRes, walletRes, historyRes, promotionsRes] = await Promise.all([
    service.from('profiles').select('is_verified,is_admin').eq('id', auth.profile.id).single(),
    service.from('shoes').select('*,shoe_images(*),shops(*)').eq('seller_id', auth.profile.id).eq('status','active').eq('listing_type','for_sale').order('created_at',{ascending:false}).limit(50),
    service.from('gp_coin_wallets').select('available_balance,locked_at').eq('profile_id',auth.profile.id).maybeSingle(),
    service.from('flash_deals').select('listing_id,created_at').eq('seller_id',auth.profile.id).gte('created_at',new Date(Date.now()-7*86400000).toISOString()),
    service.from('featured_promotion_orders').select('listing_id').eq('seller_id',auth.profile.id).in('status',['reserved','queued','active']),
  ]);
  const shoes = (listingRes.data ?? []) as unknown as Shoe[];
  const live = shoes.find(shoe => isFlashDealLive(shoe));
  const ids = shoes.map(shoe => shoe.id);
  const prices = ids.length ? await service.from('listing_price_history').select('listing_id,price_php').in('listing_id',ids)
    .gte('recorded_at',new Date(Date.now()-7*86400000).toISOString()) : { data: [], error: null };
  const recent = new Set((historyRes.data ?? []).map(item => item.listing_id));
  const featured = new Set((promotionsRes.data ?? []).map(item => item.listing_id));
  const choices: FlashDealChoice[] = shoes.map(shoe => {
    const image = shoe.shoe_images?.find(item => item.view_type==='top') ?? shoe.shoe_images?.[0];
    const reference = Math.min(Number(shoe.price_php), ...(prices.data ?? []).filter(item=>item.listing_id===shoe.id).map(item=>Number(item.price_php)));
    const reason = !shoe.has_stock || !shoe.listed_in_main_feed ? 'This listing must be in stock and visible in the marketplace.'
      : shoe.quality_flagged_at || shoe.running_relevance_flagged ? 'This listing needs review before it can be promoted.'
      : shoe.shop_id && shoe.shops?.status !== 'active' ? 'This shop must be active before its shoes can be promoted.'
      : !image ? 'Add a photo to this listing first.'
      : featured.has(shoe.id) || (shoe.featured_until && Date.parse(shoe.featured_until)>Date.now()) || (shoe.sponsored_until && Date.parse(shoe.sponsored_until)>Date.now()) ? 'These shoes already have a promotion. Choose another listing or wait until it ends.'
      : recent.has(shoe.id) ? 'These shoes can join Flash Deals once every 7 days. Choose another listing.'
      : !(reference>0) ? 'Set a regular asking price before starting a deal.' : null;
    return { id:shoe.id, name:formatListingName(shoe.brand,shoe.model), price:Number(shoe.price_php), reference,
      image:image ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!,image.storage_path,'shoe-images',IMAGE_TRANSFORM_PRESETS.listingCard) : null,reason };
  });
  return <PageShell contentClassName="max-w-2xl"><Link href="/profile" className="mb-4 inline-flex min-h-11 items-center text-sm text-teal-300">← Back to your profile</Link>
    <PageHeader eyebrow="Seller tools" title="Start a flash deal" subtitle="Offer a lower price for 24 hours. Use 20 GP Coins (₱10 value) to promote your shoes in Flash Deals." />
    {historyRes.error || prices.error || listingRes.error || walletRes.error || profileRes.error || promotionsRes.error ? <p role="alert" className="rounded-xl border border-gray-700 p-4 text-sm text-gray-300">Flash Deals is temporarily unavailable. Your coins have not been spent. Please try again later.</p>
      : !(profileRes.data?.is_verified || profileRes.data?.is_admin) ? <div className="rounded-xl border border-amber-200/25 p-5"><h2 className="font-bold text-gray-100">Get verified before promoting your shoes</h2><p className="mt-2 text-sm leading-6 text-gray-300">Verification helps buyers know who they are dealing with. You can keep listing and editing prices for free.</p><Link href="/profile#verification" className="mt-3 inline-flex min-h-12 items-center text-sm font-bold text-teal-300">Get verified →</Link></div>
      : live ? <div className="space-y-4 rounded-xl border border-amber-200/25 p-5"><h2 className="font-bold text-gray-100">Your flash deal is already live</h2><p className="text-sm text-gray-300">{formatListingName(live.brand,live.model)} · {formatPrice(live.flash_deal_price_php!)}. You can run one deal at a time.</p><Link href={getListingPath(live)} className="inline-flex min-h-11 items-center text-sm font-bold text-teal-300">View and share your deal →</Link><EndFlashDealButton dealId={live.flash_deal_id!} /></div>
      : !choices.length ? <div className="rounded-xl border border-gray-700 p-5"><p className="text-sm leading-6 text-gray-300">Create a for-sale listing first, then come back to choose a sale price.</p><Link href="/listings/new" className="mt-3 inline-flex min-h-12 items-center font-bold text-teal-300">List your shoes →</Link></div>
      : <FlashDealForm listings={choices} balance={Number(walletRes.data?.available_balance ?? 0)} locked={Boolean(walletRes.data?.locked_at)} initialListing={searchParams.listing} initialSale={searchParams.sale} />}
    <p className="mt-5 text-sm leading-6 text-gray-400">Just want to lower your asking price? <Link href="/profile#active-listings" className="text-teal-300 underline">Edit your listing for free.</Link></p>
  </PageShell>;
}
