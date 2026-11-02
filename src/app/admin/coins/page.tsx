import { notFound } from 'next/navigation';
import Link from 'next/link';
import { paymentUser } from '@/lib/payments/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { CoinPurchase } from '@/lib/payments/coinPurchases';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { CoinPurchasesAdmin } from '@/components/payments/CoinPurchasesAdmin';
export const dynamic='force-dynamic';
export const metadata={title:'Coin purchases — Admin',robots:{index:false,follow:false}};

export default async function AdminCoinsPage(){
  const auth=await paymentUser();if(!auth?.profile.is_admin)notFound();
  const{data,error}=await createServiceClient().from('gp_coin_purchases').select('*').order('created_at',{ascending:false}).limit(50);
  return <PageShell contentClassName="max-w-3xl"><Link href="/admin" className="mb-5 inline-flex min-h-11 items-center text-sm text-teal-300">← Admin</Link>
    <PageHeader title="Coin purchases" subtitle="Verify payments and recover unresolved checkouts. Wallet holds and refunds require a review of the merchant record."/>
    {error?<p role="alert" className="text-sm text-amber-100">Could not load coin purchases. Confirm migration 062 has been applied.</p>:<CoinPurchasesAdmin initialPurchases={(data??[])as CoinPurchase[]}/>}
  </PageShell>;
}
