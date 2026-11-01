import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  reconcileEstimatorPayment,
  type EstimatorPayment,
} from '@/lib/pricing/estimatorPayments';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const live = process.env.PAYMONGO_MODE === 'live';
  const { data, error } = await service
    .from('estimator_payments')
    .select('*')
    .eq('livemode', live)
    .in('status', ['creating', 'pending', 'paid', 'review'])
    .order('last_checked_at', { nullsFirst: true })
    .limit(3);
  if (error)
    return NextResponse.json(
      { error: 'Could not load payments.' },
      { status: 503 },
    );
  const deadline = Date.now() + 30000;
  let checked = 0;
  for (const row of (data ?? []) as EstimatorPayment[]) {
    if (Date.now() > deadline) break;
    try {
      await reconcileEstimatorPayment(row);
      checked++;
    } catch {
      console.warn('[estimator-payments] reconciliation pending', row.id);
    }
  }
  return NextResponse.json({ checked });
}
