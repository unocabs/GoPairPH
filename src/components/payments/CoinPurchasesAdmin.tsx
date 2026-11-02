'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import type { CoinPurchase } from '@/lib/payments/coinPurchases';

export function CoinPurchasesAdmin({initialPurchases}:{initialPurchases:CoinPurchase[]}){
  const[items,setItems]=useState(initialPurchases);
  const[busy,setBusy]=useState('');
  const[error,setError]=useState('');
  const[checkoutIds,setCheckoutIds]=useState<Record<string,string>>({});
  async function act(id:string,action:'check'|'recover'){
    setBusy(id);setError('');
    try{
      const response=await fetch(`/api/admin/coins/purchases/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='recover'?{checkoutId:checkoutIds[id]}:{})})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error??'Could not check this purchase.');
      setItems(rows=>rows.map(row=>row.id===id?data.purchase:row));
    }catch(failure){setError(failure instanceof Error?failure.message:'Please try again.');}finally{setBusy('');}
  }
  return <div className="space-y-4">{error&&<p role="alert" className="rounded-xl border border-red-400/30 p-3 text-sm text-red-200">{error}</p>}
    {!items.length&&<p className="text-sm text-gray-400">No coin purchases yet.</p>}
    {items.map(item=><section key={item.id} className="rounded-xl border border-white/10 bg-slate-900 p-4">
      <h2 className="font-bold text-gray-100">{item.coins} GP · {formatPrice(item.amount_minor/100)} · {item.status} {!item.livemode&&<span className="text-amber-200">(Test)</span>}</h2>
      <p className="mt-2 break-all text-xs leading-5 text-gray-400">Reference: {item.id}<br/>Account: {item.profile_id}<br/>Checkout: {item.provider_checkout_id??'Creation unresolved'}<br/>Payment: {item.provider_payment_id??'Not confirmed'}<br/>Refunded: {formatPrice(item.refunded_amount_minor/100)}</p>
      {item.review_note&&<p className="mt-2 text-sm leading-6 text-amber-100">{item.review_note}</p>}
      <Button variant="neutral" className="mt-3 min-h-11" loading={busy===item.id} disabled={Boolean(busy)} onClick={()=>void act(item.id,'check')}>Verify with PayMongo</Button>
      {!item.provider_checkout_id&&!item.paid_at&&!['expired','refunded'].includes(item.status)&&<form className="mt-3" onSubmit={event=>{event.preventDefault();void act(item.id,'recover');}}>
        <label htmlFor={`recover-${item.id}`} className="block text-sm text-gray-300">Recover a checkout with this exact reference</label>
        <div className="mt-2 flex flex-wrap gap-2"><input id={`recover-${item.id}`} required pattern="cs_[A-Za-z0-9]+" placeholder="cs_…" value={checkoutIds[item.id]??''} onChange={event=>setCheckoutIds(values=>({...values,[item.id]:event.target.value}))} className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-950 px-3 text-base text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"/><Button type="submit" className="min-h-11" disabled={Boolean(busy)}>Verify and recover</Button></div>
        <p className="mt-2 text-xs leading-5 text-gray-400">Find the checkout in the merchant dashboard. Recovery rechecks its account reference, amount, currency and environment; it never assumes payment succeeded.</p>
      </form>}
    </section>)}
  </div>;
}
