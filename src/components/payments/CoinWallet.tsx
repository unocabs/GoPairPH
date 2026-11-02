'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { COIN_PACKS, coinReturnPath } from '@/lib/flashDeals';
import { formatPrice } from '@/lib/utils';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { CoinPurchase } from '@/lib/payments/coinPurchases';

const labels: Record<CoinPurchase['status'], string> = { creating:'Opening checkout',pending:'Awaiting payment',paid:'Coins added',expired:'Checkout closed',review:'Payment needs a check',refunded:'Refund confirmed' };

export function CoinWallet({ initialBalance, initialLocked, initialPurchases, selected, returnPath, enabled, methods, verified, testMode }: {
  initialBalance:number; initialLocked:boolean; initialPurchases:CoinPurchase[]; selected:CoinPurchase|null;
  returnPath:string; enabled:boolean; methods:string[]; verified:boolean; testMode:boolean;
}) {
  const router = useRouter();
  const [balance,setBalance] = useState(initialBalance);
  const [locked,setLocked] = useState(initialLocked);
  const [purchases,setPurchases] = useState(initialPurchases);
  const [order,setOrder] = useState<CoinPurchase|null>(selected ?? initialPurchases.find(item=>!item.paid_at && ['creating','pending','review'].includes(item.status)) ?? null);
  const [coins,setCoins] = useState<number>(40);
  const [busy,setBusy] = useState(false);
  const [checking,setChecking] = useState(false);
  const [warning,setWarning] = useState('');
  const [error,setError] = useState('');
  const checkingRef = useRef(false);
  const pack = COIN_PACKS.find(item=>item.coins===coins)!;
  const pending = purchases.find(item=>!item.paid_at && ['creating','pending','review'].includes(item.status));
  const qr = methods.includes('QR Ph');
  const destination = coinReturnPath(order?.return_path ?? returnPath);

  const check = useCallback(async (id:string, cancel=false) => {
    if (checkingRef.current) return;
    checkingRef.current=true;setChecking(true);setWarning('');setError('');
    try {
      const response=await fetch(`/api/coins/purchases/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:cancel?'cancel':'check'})});
      const data=await response.json();
      if(!response.ok || !data.purchase) throw Error(data.error ?? 'Could not check this payment.');
      const fresh=data.purchase as CoinPurchase;
      setOrder(fresh);setBalance(data.balance);setLocked(data.locked);setWarning(data.warning ?? '');
      setPurchases(items=>[fresh,...items.filter(item=>item.id!==fresh.id)].slice(0,20));
      if(fresh.paid_at || fresh.status==='expired') router.refresh();
    } catch(failure){setWarning(failure instanceof Error ? failure.message : 'Please check again. Avoid paying twice while confirmation is pending.');}
    finally {checkingRef.current=false;setChecking(false);}
  },[router]);

  const orderId = order?.id;
  const orderPaidAt = order?.paid_at;
  const orderStatus = order?.status;
  useEffect(()=>{
    if(!orderId || orderPaidAt || orderStatus==='expired' || orderStatus==='refunded')return;
    let attempts=0;
    void check(orderId);
    const interval=window.setInterval(()=>{if(++attempts>=12)window.clearInterval(interval);else void check(orderId);},10_000);
    return()=>window.clearInterval(interval);
  },[orderId,orderPaidAt,orderStatus,check]);

  async function buy(event:React.FormEvent){
    event.preventDefault();if(busy||!enabled||!verified||locked||pending)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/coins/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coins,returnPath})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error??'Could not open checkout.');
      trackMarketplaceAction('coin_checkout_started',{coins,price_php:pack.pricePhp});
      const checkout=data.checkoutUrl;
      if(typeof checkout==='string'){
        const url=new URL(checkout);
        if(url.protocol!=='https:'||url.hostname!=='checkout.paymongo.com'||url.username||url.password||url.port)throw Error('Could not open a secure checkout. Check your payment history before trying again.');
        window.location.assign(checkout);
      }else if(typeof data.statusUrl==='string' && /^\/coins\?order=[a-f0-9-]{36}$/i.test(data.statusUrl))window.location.assign(data.statusUrl);
      else throw Error('Please check your purchase history before trying again.');
    }catch(failure){setError(failure instanceof Error?failure.message:'Please check your connection and try again.');setBusy(false);}
  }

  return <div className="space-y-5">
    <section aria-labelledby="coin-balance" className="rounded-2xl border border-amber-200/20 bg-amber-200/[0.04] p-5">
      <h2 id="coin-balance" className="text-sm font-semibold text-gray-300">Your available GP Coins</h2><p className="mt-2 text-3xl font-black text-amber-100">{balance.toLocaleString('en-PH')} GP</p>
      <p className="mt-2 text-sm leading-6 text-gray-300">2 GP Coins = ₱1 in promotion credit. A 24-hour Flash Deal costs 20 GP (₱10 value).</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">Bought coins do not expire. Earned coins expire after 6 months. Coins pay for promotions, not shoes, and cannot be transferred or withdrawn.</p>
    </section>
    {testMode && <p role="status" className="rounded-xl border border-amber-200/30 p-3 text-sm text-amber-100">Test checkout mode. These are test purchases, not live payments.</p>}
    {locked && <p role="alert" className="rounded-xl border border-amber-200/30 p-4 text-sm leading-6 text-amber-100">Your wallet needs a payment review. Buying and spending coins are paused. <Link href="/contact" className="font-bold underline">Contact support</Link> with your purchase reference.</p>}

    {order && <section id="coin-purchase-status" tabIndex={-1} aria-labelledby="coin-purchase-title" className="scroll-mt-24 rounded-2xl border border-teal-300/25 bg-slate-900 p-5">
      <h2 id="coin-purchase-title" className="text-lg font-bold text-gray-100">{order.coins} GP Coins · {formatPrice(order.amount_minor/100)}</h2>
      <p role="status" aria-live="polite" className="mt-2 font-bold text-teal-200">{checking?'Checking payment…':labels[order.status]}</p>
      <p className="mt-2 text-sm leading-6 text-gray-300">{order.status==='paid'?'Your payment is confirmed and your coins are in your wallet. You can use them now.'
        :order.status==='refunded'?'PayMongo confirmed this refund. The refunded coin credits have been removed.'
        :order.status==='expired'?'This checkout is closed. No coins were added. If you were charged, check again or contact support before paying again.'
        :order.paid_at?'Your payment was received and needs review. Please contact support before paying again.'
        :'Coins are added only after payment is verified. Returning from checkout alone does not confirm payment. If you already paid, please wait and check status.'}</p>
      {order.status==='review' && order.review_note && <p className="mt-2 text-sm leading-6 text-amber-100">{order.review_note}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status==='paid' && !locked && <Link href={destination} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-400 px-4 text-center font-bold text-gray-950">{destination.startsWith('/flash-deals/new')?'Continue to your flash deal':'Back to your profile'} →</Link>}
        {!order.paid_at && order.status==='pending' && order.checkout_url && <a href={order.checkout_url} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-500 px-4 text-sm font-bold text-gray-950">Resume secure checkout</a>}
        <Button variant="neutral" className="min-h-11" loading={checking} onClick={()=>void check(order.id)}>Check payment status</Button>
        {!order.paid_at && order.status==='pending' && <Button variant="ghost" className="min-h-11" disabled={checking} onClick={()=>void check(order.id,true)}>Close unpaid checkout</Button>}
      </div>
      {warning && <p role="alert" className="mt-3 text-sm leading-6 text-amber-100">{warning}</p>}
      <p className="mt-4 break-all text-xs leading-5 text-gray-400">Purchase reference: {order.id}</p>
      <Link href="/contact" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-300 underline">Get payment help</Link>
    </section>}

    {!verified ? <div className="rounded-xl border border-amber-200/20 p-4"><p className="text-sm leading-6 text-gray-300">Get verified before buying coins or promoting shoes. Listing and editing prices are free.</p><Link href="/profile#verification" className="mt-2 inline-flex min-h-11 items-center font-bold text-teal-300">Get verified →</Link></div>
      : <form onSubmit={buy} aria-busy={busy} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <fieldset disabled={busy||locked||Boolean(pending)||!enabled}><legend className="text-lg font-bold text-gray-100">Choose a coin pack</legend>
          <p className="mt-1 text-sm leading-6 text-gray-400">One-time payment. No subscription or automatic top-ups.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">{COIN_PACKS.map(item=><label key={item.coins} className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-teal-400 ${coins===item.coins?'border-teal-300 bg-teal-400/10':'border-gray-600 bg-gray-950'}`}>
            <input type="radio" name="coin-pack" value={item.coins} checked={coins===item.coins} onChange={()=>setCoins(item.coins)} className="h-5 w-5 shrink-0 accent-teal-400" />
            <span><span className="block font-bold text-gray-100">{item.coins} GP</span><span className="mt-1 block text-sm text-gray-300">{formatPrice(item.pricePhp)}</span></span>
          </label>)}</div>
        </fieldset>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm"><span className="text-gray-300">Total for {pack.coins} GP Coins</span><strong className="text-lg text-gray-100">{formatPrice(pack.pricePhp)}</strong></div>
        {!enabled && <p role="status" className="mt-3 text-sm leading-6 text-amber-100">Coin checkout is temporarily unavailable. You can still use earned GP Coins for Flash Deals.</p>}
        {pending && <p role="status" className="mt-3 text-sm leading-6 text-amber-100">You have an unfinished purchase. Check or close it above before starting another payment.</p>}
        {error && <p role="alert" className="mt-3 text-sm leading-6 text-red-200">{error}</p>}
        <Button type="submit" loading={busy} disabled={!enabled||locked||Boolean(pending)} className="mt-4 min-h-12 w-full text-base font-bold">{busy?'Opening secure checkout…':`Pay ${formatPrice(pack.pricePhp)}${qr?' with QR Ph':' securely'}`}</Button>
        <p className="mt-2 text-xs leading-5 text-gray-400">Secure checkout by PayMongo{methods.length?` · ${methods.join(', ')}`:''}. Your bank or e-wallet handles payment. Coins appear after verification.</p>
      </form>}
    <section className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-gray-300"><h2 className="font-bold text-gray-100">You can earn coins too</h2><p className="mt-1">Publish eligible listings, renew your shoes, and use the Share Post Kit. Buying coins is optional.</p><Link href="/profile#gp-coins" className="mt-1 inline-flex min-h-11 items-center font-semibold text-teal-300">See your coin rewards →</Link></section>
    {purchases.length>0 && <section><h2 className="mb-3 text-lg font-bold text-gray-100">Your coin purchases</h2><ul className="divide-y divide-white/10 rounded-xl border border-white/10 px-4">{purchases.map(item=><li key={item.id}><button type="button" onClick={()=>{setOrder(item);setWarning('');document.getElementById('coin-purchase-status')?.focus();}} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
      <span><strong className="text-sm text-gray-100">{item.coins} GP · {formatPrice(item.amount_minor/100)}</strong><span className="mt-1 block text-xs text-gray-400">{new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',timeZone:'Asia/Manila'}).format(new Date(item.created_at))}</span></span><span className="text-xs font-semibold text-teal-200">{labels[item.status]} →</span>
    </button></li>)}</ul></section>}
    <p className="text-xs leading-5 text-gray-400">Need help with an accidental or duplicate payment? <Link href="/contact" className="text-teal-300 underline">Contact support</Link> with your reference. Refunds are reviewed and confirmed through PayMongo; requesting a refund does not mean it has completed. <Link href="/help/flash-deals" className="text-teal-300 underline">Read the coin and Flash Deal rules.</Link></p>
  </div>;
}
