import { historyCursor } from '@/lib/pricing/historyCursor';
import { monthlyExpiry } from '@/lib/pricing/billingDates';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import {
  estimatorUser,
  estimatorAccess,
  estimatorCatalogue,
  createEstimate,
  getSavedEstimate,
} from '@/lib/pricing/estimatorServer';
import { estimatorRequestSchema } from '@/lib/pricing/estimatorValidation';
import { paymentsEnabled } from '@/lib/payments/provider';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await estimatorUser();
    const [catalogue, access, history, payments] = await Promise.all([
      estimatorCatalogue(),
      estimatorAccess(user?.id ?? null),
      user
        ? createServiceClient()
            .from('estimator_estimates')
            .select('id,input,result,created_at,parent_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(31)
        : Promise.resolve({ data: [], error: null }),
      user
        ? createServiceClient()
            .from('estimator_payments')
            .select(
              'id,plan,status,checkout_url,created_at,paid_at,review_note',
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (history.error || payments.error) throw Error('Could not load history.');
    const rows = history.data ?? [];
    const trialEstimate =
      user && access.trialEstimateId
        ? (rows.find((row) => row.id === access.trialEstimateId) ??
          (await getSavedEstimate(user.id, access.trialEstimateId)))
        : null;
    return NextResponse.json(
      {
        models: catalogue.models,
        access,
        history: rows.slice(0, 30),
        nextHistoryCursor: rows.length > 30 ? historyCursor(rows[29]) : null,
        trialEstimate,
        monthlyExpiresIfPaidNow: monthlyExpiry(
          access.expiresAt && Date.parse(access.expiresAt) > Date.now()
            ? access.expiresAt
            : new Date(),
        ),
        payments: payments.data,
        signedIn: !!user,
        checkoutEnabled:
          access.premiumEnabled &&
          paymentsEnabled() &&
          process.env.ESTIMATOR_CHECKOUT_ENABLED === 'true',
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The upgraded estimator is being set up. Please try again shortly.',
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  const parsed = estimatorRequestSchema.safeParse(
    await smallJson(request).catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your shoe details.' },
      { status: 400 },
    );
  const user = await estimatorUser();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in to save your estimate.' },
      { status: 401 },
    );
  try {
    const estimate = await createEstimate(
      user.id,
      parsed.data.request_id,
      parsed.data.input,
      parsed.data.parent_id ?? null,
    );
    return NextResponse.json(
      { estimate, access: await estimatorAccess(user.id) },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : 'Could not complete the estimate.';
    const premium = message === 'Premium access required',
      limited = message === 'Please try again later';
    return NextResponse.json(
      { error: message },
      { status: premium ? 402 : limited ? 429 : 400 },
    );
  }
}
