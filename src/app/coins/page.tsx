import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { paymentUser } from '@/lib/payments/server';
import { createServiceClient } from '@/lib/supabase/server';
import { coinReturnPath } from '@/lib/flashDeals';
import { getCoinPurchase, type CoinPurchase } from '@/lib/payments/coinPurchases';
import { paymentConfiguration, paymentsEnabled, validCheckoutUrl } from '@/lib/payments/provider';
import { CoinWallet } from '@/components/payments/CoinWallet';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'GP Coins — Wallet & Purchases',robots:{index:false,follow:false}};

export default async function CoinsPage({searchParams}:{searchParams:{order?:string;next?:string}}){
  const returnPath=coinReturnPath(searchParams.next);
  const auth=await paymentUser();
  if(!auth)redirect(`/auth/sign-in?next=${encodeURIComponent(`/coins?${new URLSearchParams({next:returnPath,...(searchParams.order?{order:searchParams.order}:{})})}`)}`);
  const service=createServiceClient();
  await service.rpc('gp_coin_expire_available',{p_profile_id:auth.profile.id});
  const [wallet,history,profile]=await Promise.all([
    service.from('gp_coin_wallets').select('available_balance,locked_at').eq('profile_id',auth.profile.id).maybeSingle(),
    service.from('gp_coin_purchases').select('*').eq('profile_id',auth.profile.id).order('created_at',{ascending:false}).limit(20),
    service.from('profiles').select('is_verified,is_admin').eq('id',auth.profile.id).single(),
  ]);
  let selected:CoinPurchase|null=null;
  if(z.string().uuid().safeParse(searchParams.order).success){const purchase=await getCoinPurchase(searchParams.order!);if(purchase?.profile_id===auth.profile.id)selected=purchase;}
  let methods:string[]=[];let testMode=false;
  try{if(paymentsEnabled()){const config=paymentConfiguration();methods=config.labels;testMode=!config.live;}}catch{/* Keep checkout unavailable until configured. */}
  const safe=(item:CoinPurchase):CoinPurchase=>({...item,checkout_url:item.checkout_url&&validCheckoutUrl(item.checkout_url)?item.checkout_url:null});
  return <PageShell contentClassName="max-w-2xl"><Link href={returnPath} className="mb-4 inline-flex min-h-11 items-center text-sm text-teal-300">← {returnPath.startsWith('/flash-deals/new')?'Back to your flash deal':'Back to your profile'}</Link>
    <PageHeader eyebrow="Your promotion wallet" title="GP Coins" subtitle="Buy or earn coins to promote your running shoes. Clear prices, one-time payments, and no subscription." />
    {history.error||wallet.error?<p role="alert" className="rounded-xl border border-gray-700 p-4 text-sm leading-6 text-gray-300">Coin purchases are not available right now. Your existing balance is safe. Please try again later or contact support if you were charged.</p>
      :<>{searchParams.order&&!selected&&<p role="alert" className="mb-4 text-sm text-amber-100">That purchase could not be found in your account. Choose a purchase below or contact support.</p>}
      <CoinWallet initialBalance={Number(wallet.data?.available_balance??0)} initialLocked={Boolean(wallet.data?.locked_at)} initialPurchases={((history.data??[])as CoinPurchase[]).map(safe)} selected={selected?safe(selected):null} returnPath={returnPath} enabled={methods.length>0} methods={methods} testMode={testMode} verified={Boolean(profile.data?.is_verified||profile.data?.is_admin)}/></>}
  </PageShell>;
}
