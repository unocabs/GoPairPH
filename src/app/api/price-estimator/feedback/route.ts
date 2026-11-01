import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import { priceFeedbackSchema, priceFeedbackSnapshot } from '@/lib/pricing/feedbackValidation';
import { processFeedbackEmails, saveProductFeedback } from '@/lib/feedbackServer';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = priceFeedbackSchema.safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Check your feedback.' }, { status: 400 });
  const auth = await createClient().auth.getUser();
  const user = auth.error ? null : auth.data.user;
  const service = createServiceClient();
  const { data: profile, error: profileError } = user
    ? await service.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
    : { data: null, error: null };
  if (profileError) return NextResponse.json({ error: 'Could not check your profile. Please try again.' }, { status: 503 });
  const data = parsed.data;
  const saved = await saveProductFeedback(request, {
    submission_id: data.submission_id, user_id: user?.id ?? null, profile_id: profile?.id ?? null, listing_id: null,
    category: 'price_estimate', message: data.message || 'No additional comment provided.', contact_email: user?.email ?? null,
    page_path: '/price-guide', price_reason: data.reason, suggested_price_php: data.suggested_price_php,
    estimator_snapshot: priceFeedbackSnapshot(data),
  }, user?.id ?? null, service);
  if (saved.error) {
    const limited = saved.error.message === 'Please try again later';
    return NextResponse.json({ error: limited ? 'Please wait a little before sending more feedback.' : 'Could not save feedback. Please try again later.' },
      { status: limited ? 429 : 503, headers: limited ? { 'Retry-After': '60' } : {} });
  }
  try { await processFeedbackEmails(saved.data as string, service); }
  catch (error) { console.error('[price-feedback] notification deferred', error); }
  return NextResponse.json({ ok: true }, { status: 201 });
}
