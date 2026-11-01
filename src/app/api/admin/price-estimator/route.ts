import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';
import { permittedRetailUrl } from '@/lib/pricing/retailImport';
import { verifyEstimatorCheckout } from '@/lib/pricing/estimatorPayments';
export const dynamic = 'force-dynamic';
async function admin() {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client
    .from('profiles')
    .select('id,is_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.is_admin ? data : null;
}
export async function GET() {
  if (!(await admin()))
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const service = createServiceClient();
  const tables = [
    ['settings', 'estimator_settings'],
    ['models', 'estimator_models'],
    ['sources', 'estimator_sources'],
    ['references', 'estimator_retail_references'],
    ['outcomes', 'estimator_sale_observations'],
    ['payments', 'estimator_payments'],
  ] as const;
  const data = await Promise.all(
    tables.map(async ([key, table]) => {
      let query = service.from(table).select('*');
      if (['references', 'outcomes', 'payments'].includes(key))
        query = query.order('created_at', { ascending: false });
      const result = await query.limit(key === 'references' ? 60 : 30);
      return { key, ...result };
    }),
  );
  if (data.some((row) => row.error))
    return NextResponse.json(
      { error: 'Apply migration 059 before opening estimator administration.' },
      { status: 503 },
    );
  return NextResponse.json(
    Object.fromEntries(data.map((row) => [row.key, row.data])),
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reference'),
    source_id: z.string().uuid(),
    price_php: z.number().finite().positive().max(1000000),
    regular_price_php: z.number().finite().positive().max(1000000),
    observed_at: z.string().datetime(),
    valid_until: z.string().datetime().nullable().default(null),
    availability: z.enum(['available', 'unknown', 'out_of_stock']),
  }),
  z.object({
    action: z.literal('publish'),
    id: z.string().uuid(),
    published: z.boolean(),
  }),
  z.object({
    action: z.literal('source'),
    id: z.string().uuid(),
    enabled: z.boolean(),
    permission_note: z.string().trim().min(11).max(1000),
  }),
  z.object({
    action: z.literal('outcome'),
    model_id: z.string().min(1).max(100),
    condition: z.enum(['new', 'like_new', 'good', 'fair']),
    price_php: z.number().finite().positive().max(1000000),
    sold_at: z.string().datetime(),
    seller_group: z.string().trim().min(3).max(100),
    provenance: z.enum(['seller_reported', 'buyer_seller_confirmed']),
    evidence_note: z.string().trim().min(10).max(1000),
    approved: z.boolean(),
  }),
  z.object({
    action: z.literal('outcome_review'),
    id: z.string().uuid(),
    approved: z.boolean(),
  }),
  z.object({
    action: z.literal('recover_payment'),
    id: z.string().uuid(),
    checkout_id: z.string().regex(/^cs_[A-Za-z0-9]+$/),
  }),
]);
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const profile = await admin();
  if (!profile)
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const parsed = schema.safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the details.' },
      { status: 400 },
    );
  const service = createServiceClient(),
    data = parsed.data;
  try {
    if (data.action === 'reference') {
      if (
        data.price_php > data.regular_price_php ||
        Date.parse(data.observed_at) > Date.now() + 60000 ||
        Date.parse(data.observed_at) < Date.now() - 365 * 86400000 ||
        (data.valid_until &&
          Date.parse(data.valid_until) <= Date.parse(data.observed_at))
      )
        throw Error('Check the price, observed date, and expiry.');
      const source = await service
        .from('estimator_sources')
        .select('*')
        .eq('id', data.source_id)
        .single();
      if (source.error || !permittedRetailUrl(source.data.url))
        throw Error('Unknown or unsupported retail source.');
      const row = source.data;
      const result = await service.from('estimator_retail_references').insert({
        source_id: row.id,
        model_id: row.model_id,
        source_url: row.url,
        source_name: row.source_name,
        variant: row.variant,
        price_php: data.price_php,
        regular_price_php: data.regular_price_php,
        observed_at: data.observed_at,
        valid_until: data.valid_until,
        availability: data.availability,
        method: 'manual',
        published: true,
        reviewed_by: profile.id,
      });
      if (result.error) throw Error('Could not save reference.');
    } else if (data.action === 'publish') {
      const result = await service
        .from('estimator_retail_references')
        .update({ published: data.published, reviewed_by: profile.id })
        .eq('id', data.id)
        .select('id')
        .single();
      if (result.error) throw Error('Reference not found.');
    } else if (data.action === 'source') {
      const result = await service
        .from('estimator_sources')
        .update({
          fetch_enabled: data.enabled,
          permission_confirmed: data.enabled,
          permission_note: data.permission_note,
          next_due_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select('id')
        .single();
      if (result.error) throw Error('Source not found.');
    } else if (data.action === 'outcome') {
      if (Date.parse(data.sold_at) > Date.now())
        throw Error('A sale cannot be in the future.');
      const { action, ...row } = data;
      void action;
      const result = await service
        .from('estimator_sale_observations')
        .insert({ ...row, reviewed_by: profile.id });
      if (result.error) throw Error('Could not save resale observation.');
    } else if (data.action === 'outcome_review') {
      const result = await service
        .from('estimator_sale_observations')
        .update({ approved: data.approved, reviewed_by: profile.id })
        .eq('id', data.id)
        .select('id')
        .single();
      if (result.error) throw Error('Observation not found.');
    } else {
      const result = await verifyEstimatorCheckout(data.checkout_id, data.id);
      if (!result) throw Error('Payment record not found.');
    }
    revalidateTag('estimator-catalogue');
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : 'Could not update estimator.',
      },
      { status: 400 },
    );
  }
}
