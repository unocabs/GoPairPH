import { NextResponse } from 'next/server';
import { estimatorUser } from '@/lib/pricing/estimatorServer';
import { createServiceClient } from '@/lib/supabase/server';
import { historyCursor, parseHistoryCursor } from '@/lib/pricing/historyCursor';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await estimatorUser();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in to view saved estimates.' },
      { status: 401 },
    );
  const before = new URL(request.url).searchParams.get('before'),
    cursor = before ? parseHistoryCursor(before) : null;
  if (before && !cursor)
    return NextResponse.json(
      { error: 'Invalid history page.' },
      { status: 400 },
    );
  let query = createServiceClient()
    .from('estimator_estimates')
    .select('id,input,result,created_at,parent_id')
    .eq('user_id', user.id);
  if (cursor)
    query = query.or(
      `created_at.lt.${cursor.date},and(created_at.eq.${cursor.date},id.lt.${cursor.id})`,
    );
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(31);
  if (error)
    return NextResponse.json(
      { error: 'Could not load saved history.' },
      { status: 503 },
    );
  const rows = data ?? [];
  return NextResponse.json(
    {
      history: rows.slice(0, 30),
      nextHistoryCursor: rows.length > 30 ? historyCursor(rows[29]) : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
