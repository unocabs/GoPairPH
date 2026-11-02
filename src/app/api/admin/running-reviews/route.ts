import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const { data: profile } = await client.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  const page = Math.max(1, Math.min(10000, Number.parseInt(new URL(request.url).searchParams.get('page') ?? '1', 10) || 1));
  const { data, error, count } = await createServiceClient().from('listing_running_reviews')
    .select('*, listing:shoes!inner(id, slug, brand, model)', { count: 'exact' })
    .neq('status', 'approved').order('status').order('updated_at', { ascending: false }).order('listing_id')
    .range((page - 1) * 20, page * 20 - 1);
  if (error) return NextResponse.json({ error: 'Could not load reviews. Apply migration 060 first.' }, { status: 503 });
  return NextResponse.json({ reviews: data, total: count, page }, { headers: { 'Cache-Control': 'no-store' } });
}
