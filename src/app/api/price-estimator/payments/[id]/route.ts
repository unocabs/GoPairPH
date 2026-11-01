import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import { estimatorUser, estimatorAccess } from '@/lib/pricing/estimatorServer';
import {
  estimatorPayment,
  reconcileEstimatorPayment,
} from '@/lib/pricing/estimatorPayments';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  const user = await estimatorUser();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in to check your payment.' },
      { status: 401 },
    );
  if (!z.string().uuid().safeParse(params.id).success)
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  const parsed = z
    .object({ action: z.enum(['check', 'cancel']).default('check') })
    .safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid payment action.' },
      { status: 400 },
    );
  const payment = await estimatorPayment(params.id, user.id);
  if (!payment)
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  try {
    await reconcileEstimatorPayment(payment, parsed.data.action === 'cancel');
    return NextResponse.json({
      payment: await estimatorPayment(params.id, user.id),
      access: await estimatorAccess(user.id),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Payment confirmation is pending. Please avoid paying again and check later.',
      },
      { status: 503 },
    );
  }
}
