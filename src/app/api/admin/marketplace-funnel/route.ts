import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';

export const dynamic = 'force-dynamic';
async function adminProfile() {
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile } = await client.from('profiles').select('id,is_admin').eq('user_id', user.id).maybeSingle();
  return profile?.is_admin ? profile : null;
}
export async function GET(request: Request) {
  if (!await adminProfile()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: 'Choose 7, 30 or 90 days.' }, { status: 400 });
  const { data, error } = await createServiceClient().rpc('marketplace_funnel_overview', { p_days: days });
  if (error) return NextResponse.json({ error: 'Could not load the funnel. Check that migration 061 has been applied.' }, { status: 503 });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const admin = await adminProfile();
  if (!admin) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const body = z.object({ profile_id: z.string().uuid(), excluded: z.boolean() }).safeParse(await smallJson(request).catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid test-account selection.' }, { status: 400 });
  const service = createServiceClient();
  const result = body.data.excluded
    ? await service.from('marketplace_analytics_exclusions').upsert({ profile_id: body.data.profile_id, created_by: admin.id })
    : await service.from('marketplace_analytics_exclusions').delete().eq('profile_id', body.data.profile_id);
  if (result.error) return NextResponse.json({ error: 'Could not update the exclusion.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
