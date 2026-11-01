import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sameOrigin } from '@/lib/messaging/server';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!sameOrigin(request) || !z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.rpc('admin_chat_report', { p_report: params.id, p_close: true });
  if (error) return NextResponse.json({ error: 'Could not review report.' }, { status: error.message === 'Admin only' ? 403 : 400 });
  return NextResponse.json({ ok: true });
}
