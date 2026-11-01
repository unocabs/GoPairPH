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
const filters = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  category: z.enum(['all','price_estimate','suggestion','confusing','missing_feature','bug']).default('all'),
  status: z.enum(['all','new','reviewed','closed']).default('all'),
});
export async function GET(request: Request) {
  if (!await adminProfile()) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const parsed = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback filters.' }, { status: 400 });
  const service = createServiceClient();
  const { page, category, status } = parsed.data;
  let query = service.from('feedback_messages').select('id,category,message,contact_email,listing_id,page_path,status,created_at,price_reason,suggested_price_php,estimator_snapshot,email_status', { count: 'exact' });
  if (category !== 'all') query = query.eq('category', category);
  if (status !== 'all') query = query.eq('status', status);
  const [rows, summary] = await Promise.all([
    query.order('created_at', { ascending: false }).order('id').range((page - 1) * 30, page * 30 - 1),
    service.rpc('feedback_overview'),
  ]);
  if (rows.error || summary.error) return NextResponse.json({ error: 'Could not load feedback. Check that migration 058 has been applied.' }, { status: 503 });
  return NextResponse.json({ feedback: rows.data, total: rows.count, page, overview: summary.data }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const admin = await adminProfile();
  if (!admin) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(['new','reviewed','closed']) }).safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback status.' }, { status: 400 });
  const { data, error } = await createServiceClient().from('feedback_messages')
    .update({ status: parsed.data.status, reviewed_by: parsed.data.status === 'new' ? null : admin.id,
      reviewed_at: parsed.data.status === 'new' ? null : new Date().toISOString() })
    .eq('id', parsed.data.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update feedback.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Feedback not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
