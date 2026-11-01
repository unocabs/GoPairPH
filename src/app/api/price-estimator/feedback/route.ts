import { z } from 'zod';
import type { PriceFeedbackSnapshot } from '@/lib/feedback';
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import {
  priceFeedbackSchema,
  priceFeedbackSnapshot,
} from '@/lib/pricing/feedbackValidation';
import {
  processFeedbackEmails,
  saveProductFeedback,
} from '@/lib/feedbackServer';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (
    !sameOrigin(request) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  const body = await smallJson(request).catch(() => null);
  const savedSchema = z.object({
    estimate_id: z.string().uuid(),
    submission_id: z.string().uuid(),
    reason: z.enum(['too_low', 'too_high']),
    suggested_price_php: z
      .number()
      .finite()
      .min(1)
      .max(1_000_000)
      .multipleOf(0.01),
    message: z.string().trim().max(800).default(''),
    price_choice: z.enum(['suggested_range', 'fast_sale']),
    reference_price_php: z.number().finite().positive(),
  });
  const parsed =
    body && typeof body === 'object' && 'estimate_id' in body
      ? savedSchema.safeParse(body)
      : priceFeedbackSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check your feedback.' },
      { status: 400 },
    );
  const auth = await createClient().auth.getUser();
  const user = auth.error ? null : auth.data.user;
  const service = createServiceClient();
  const { data: profile, error: profileError } = user
    ? await service
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null, error: null };
  if (profileError)
    return NextResponse.json(
      { error: 'Could not check your profile. Please try again.' },
      { status: 503 },
    );
  const data = parsed.data;
  let snapshot: PriceFeedbackSnapshot;
  if ('estimate_id' in data) {
    if (!user)
      return NextResponse.json(
        { error: 'Sign in to review your saved estimate.' },
        { status: 401 },
      );
    const { getSavedEstimate } = await import('@/lib/pricing/estimatorServer');
    const estimate = await getSavedEstimate(user.id, data.estimate_id);
    if (!estimate)
      return NextResponse.json(
        { error: 'Estimate not found.' },
        { status: 404 },
      );
    const expected =
      data.price_choice === 'fast_sale'
        ? estimate.result.fastSalePrice
        : estimate.result.suggestedPrice;
    if (
      data.reference_price_php !== expected ||
      (data.reason === 'too_low'
        ? data.suggested_price_php <= expected
        : data.suggested_price_php >= expected)
    )
      return NextResponse.json(
        { error: 'Check the price and feedback direction.' },
        { status: 400 },
      );
    snapshot = {
      estimate_id: estimate.id,
      engine_version: estimate.result.version,
      input: estimate.input,
      estimate: estimate.result,
      reference_price_php: expected,
      price_choice: data.price_choice,
      evidence_type: estimate.result.evidenceType,
    };
  } else snapshot = priceFeedbackSnapshot(data);
  const saved = await saveProductFeedback(
    request,
    {
      submission_id: data.submission_id,
      user_id: user?.id ?? null,
      profile_id: profile?.id ?? null,
      listing_id: null,
      category: 'price_estimate',
      message: data.message || 'No additional comment provided.',
      contact_email: user?.email ?? null,
      page_path: '/price-guide',
      price_reason: data.reason,
      suggested_price_php: data.suggested_price_php,
      estimator_snapshot: snapshot,
    },
    user?.id ?? null,
    service,
  );
  if (saved.error) {
    const limited = saved.error.message === 'Please try again later';
    return NextResponse.json(
      {
        error: limited
          ? 'Please wait a little before sending more feedback.'
          : 'Could not save feedback. Please try again later.',
      },
      {
        status: limited ? 429 : 503,
        headers: limited ? { 'Retry-After': '60' } : {},
      },
    );
  }
  try {
    await processFeedbackEmails(saved.data as string, service);
  } catch (error) {
    console.error('[price-feedback] notification deferred', error);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
