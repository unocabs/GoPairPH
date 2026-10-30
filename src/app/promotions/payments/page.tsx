import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { paymentUser } from '@/lib/payments/server';
import type { PromotionPayment } from '@/lib/payments/types';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Promotion payments', robots: { index: false, follow: false } };

export default async function PromotionPaymentsPage({ searchParams }: { searchParams: { order?: string; payment?: string } }) {
  const id = z.string().uuid().safeParse(searchParams.order).success ? searchParams.order! : null;
  const auth = await paymentUser();
  if (!auth) redirect(`/auth/sign-in?next=${encodeURIComponent(`/promotions/payments${id ? `?order=${id}` : ''}`)}`);
  const service = createServiceClient();
  const select = '*,listing:shoes!promotion_payments_listing_id_fkey(id,slug,brand,model,status)';
  const [history, selected] = await Promise.all([
    service.from('promotion_payments').select(select).eq('seller_id', auth.profile.id).order('created_at', { ascending: false }).limit(30),
    id ? service.from('promotion_payments').select(select).eq('seller_id', auth.profile.id).eq('id', id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  return <PageShell contentClassName="max-w-3xl">
    <PageHeader eyebrow="Your promotions" title="Payment history" subtitle="Track your promotion payments, resume checkout, and check placement status." />
    {history.error ? <p role="alert" className="rounded-xl border border-gray-700 p-4 text-sm text-gray-300">Payment history is temporarily unavailable. Please try again later or contact support if you were charged.</p>
      : <PaymentHistory initialPayments={(history.data ?? []) as unknown as PromotionPayment[]} selected={(selected.data ?? null) as unknown as PromotionPayment | null} requested={Boolean(searchParams.order)} returned={searchParams.payment ?? ''} />}
  </PageShell>;
}
