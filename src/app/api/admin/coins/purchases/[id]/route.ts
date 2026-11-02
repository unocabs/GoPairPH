import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { paymentUser } from '@/lib/payments/server';
import { getCoinPurchase, reconcileCoinPurchase, reviewCoinPurchase, verifyCoinCheckout } from '@/lib/payments/coinPurchases';
import { validCheckoutUrl } from '@/lib/payments/provider';
export const runtime='nodejs';
export const maxDuration=60;
const action=z.object({action:z.enum(['check','review','recover']),note:z.string().trim().min(3).max(1000).optional(),checkoutId:z.string().regex(/^cs_[A-Za-z0-9]+$/).optional()});

export async function PATCH(request:Request,{params}:{params:{id:string}}){
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const auth=await paymentUser();
  if(!auth?.profile.is_admin)return NextResponse.json({error:'Admin only.'},{status:403});
  const parsed=action.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Choose a valid payment action.'},{status:400});
  const purchase=await getCoinPurchase(params.id);
  if(!purchase)return NextResponse.json({error:'Purchase not found.'},{status:404});
  try{
    if(parsed.data.action==='check')await reconcileCoinPurchase(purchase);
    else if(parsed.data.action==='review'){
      if(!parsed.data.note)return NextResponse.json({error:'Add a review note.'},{status:400});
      await reviewCoinPurchase(purchase.id,parsed.data.note);
    }else{
      if(!parsed.data.checkoutId||purchase.provider_checkout_id)return NextResponse.json({error:'Only unresolved checkout creation can be recovered.'},{status:400});
      const result=await verifyCoinCheckout(parsed.data.checkoutId,purchase.id);
      if(!result)throw Error('Checkout not found.');
      const fresh=await getCoinPurchase(purchase.id);
      if(!fresh?.paid_at){
        const service=createServiceClient();
        if(result.session.attributes.status==='expired'){
          const{error}=await service.rpc('expire_gp_coin_purchase',{p_id:purchase.id,p_checkout:null,p_live:purchase.livemode});
          if(error)throw error;
        }else{
          const url=result.session.attributes.checkout_url;
          if(!url||!validCheckoutUrl(url))throw Error('Invalid provider URL.');
          const{error}=await service.rpc('attach_gp_coin_checkout',{p_id:purchase.id,p_checkout:result.session.id,p_url:url,p_live:purchase.livemode});
          if(error)throw error;
        }
      }
    }
    return NextResponse.json({purchase:await getCoinPurchase(purchase.id)});
  }catch{return NextResponse.json({error:'Could not verify this purchase. Confirm the reference and checkout in PayMongo before trying again.'},{status:409});}
}
