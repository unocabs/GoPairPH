import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { messagingError, sameOrigin, smallJson } from '@/lib/messaging/server';
const schema = z.object({
  action: z.enum(['accept', 'decline', 'complete', 'cancel', 'withdraw']).optional(),
  status: z.enum(['accepted', 'declined']).optional(),
  version: z.number().int().positive().optional(),
  seller_message: z.string().trim().max(500).optional().nullable(),
});
type Context = { params: { id: string } };
export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await smallJson(request).catch(() => null));
  if (!z.string().uuid().safeParse(params.id).success || !parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const p = parsed.data;
  const action = p.action ?? (p.status === 'accepted' ? 'accept' : p.status === 'declined' ? 'decline' : null);
  if (!action) return NextResponse.json({ error: 'Choose a request action.' }, { status: 400 });
  const { data, error } = await supabase.rpc('marketplace_request_action', { p_request: params.id, p_action: action, p_expected_version: p.version ?? null, p_note: p.seller_message ?? null });
  if (error) return messagingError(error);
  return NextResponse.json({ ok: true, request: data });
}
export async function PATCH(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = z.object({ seller_message: z.string().trim().min(1).max(500) }).safeParse(await smallJson(request).catch(() => null));
  if (!z.string().uuid().safeParse(params.id).success || !parsed.success) return NextResponse.json({ error: 'Write a note of 1 to 500 characters.' }, { status: 400 });
  const { data, error } = await supabase.rpc('marketplace_request_action', { p_request: params.id, p_action: 'note', p_note: parsed.data.seller_message });
  if (error) return messagingError(error);
  return NextResponse.json({ ok: true, seller_message: data.seller_message, seller_message_at: data.seller_message_at });
}
