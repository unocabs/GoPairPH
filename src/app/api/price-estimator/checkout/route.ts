import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import { estimatorUser } from '@/lib/pricing/estimatorServer';
import { createEstimatorCheckout } from '@/lib/pricing/estimatorPayments';
import { paymentsEnabled } from '@/lib/payments/provider';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  const parsed = z
    .object({
      plan: z.enum(['monthly', 'permanent']),
      accept_terms: z.literal(true),
    })
    .safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Choose a plan and confirm the access terms.' },
      { status: 400 },
    );
  const user = await estimatorUser();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in before checkout.' },
      { status: 401 },
    );
  if (!paymentsEnabled() || process.env.ESTIMATOR_CHECKOUT_ENABLED !== 'true')
    return NextResponse.json(
      { error: 'Paid access is not enabled during beta.' },
      { status: 503 },
    );
  try {
    return NextResponse.json(
      await createEstimatorCheckout(user, parsed.data.plan),
    );
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : 'Could not start checkout.',
      },
      { status: 409 },
    );
  }
}
