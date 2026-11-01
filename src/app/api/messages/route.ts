import { NextResponse } from 'next/server';
import { z } from 'zod';
import { messagingUser, messagingUnavailable, messagingError, sameOrigin, smallJson } from '@/lib/messaging/server';

export const dynamic = 'force-dynamic';
const sendSchema = z.object({ listing_id: z.string().uuid(), client_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) });

export async function GET(request: Request) {
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const params = new URL(request.url).searchParams;
  const cursor = z.object({ before: z.iso.datetime({ offset: true }).nullable(), id: z.string().uuid().nullable() }).safeParse({ before: params.get('before'), id: params.get('id') });
  if (!cursor.success || Boolean(cursor.data.before) !== Boolean(cursor.data.id)) return NextResponse.json({ error: 'Invalid inbox cursor.' }, { status: 400 });
  const { data, error } = await auth.supabase.rpc('chat_inbox', {
    p_before: cursor.data.before, p_before_id: cursor.data.id, p_archived: params.get('archived') === 'true', p_limit: 20,
  });
  if (error) return messagingError(error);
  return NextResponse.json({ conversations: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const parsed = sendSchema.safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write a message of 1 to 2,000 characters.' }, { status: 400 });
  const { data, error } = await auth.supabase.rpc('chat_send', { p_listing: parsed.data.listing_id, p_client_id: parsed.data.client_id, p_body: parsed.data.body });
  if (error) return messagingError(error);
  return NextResponse.json({ message: data, conversation_id: data.conversation_id });
}
