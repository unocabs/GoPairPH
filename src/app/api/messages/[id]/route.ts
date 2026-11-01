import { NextResponse } from 'next/server';
import { z } from 'zod';
import { messagingUser, messagingUnavailable, messagingError, sameOrigin, smallJson } from '@/lib/messaging/server';
export const dynamic = 'force-dynamic';
type Context = { params: { id: string } };
const uuid = z.string().uuid();
const sendSchema = z.object({ client_id: uuid, body: z.string().trim().min(1).max(2000) });
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }),
  z.object({ action: z.literal('preferences'), muted: z.boolean().optional(), archived: z.boolean().optional() }),
  z.object({ action: z.literal('block'), blocked: z.boolean() }),
  z.object({ action: z.literal('report'), reason: z.string().trim().min(5).max(1000) }),
]);

export async function GET(request: Request, { params }: Context) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const { data: conversation, error } = await auth.supabase.from('chat_conversations').select('*').eq('id', params.id).maybeSingle();
  if (error) return messagingError(error);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  const query = new URL(request.url).searchParams;
  const before = query.get('before'); const after = query.get('after');
  if ((before && after) || [before, after].some(n => n !== null && !/^[0-9]{1,15}$/.test(n))) return NextResponse.json({ error: 'Invalid message cursor.' }, { status: 400 });
  let messagesQuery = auth.supabase.from('chat_messages').select('id,conversation_id,sequence,sender_id,body,kind,request_id,client_id,created_at').eq('conversation_id', params.id);
  if (before) messagesQuery = messagesQuery.lt('sequence', Number(before));
  if (after) messagesQuery = messagesQuery.gt('sequence', Number(after));
  const other = conversation.buyer_id === auth.profile.id ? conversation.seller_id : conversation.buyer_id;
  const [messages, partner, listing, requests, blocks] = await Promise.all([
    messagesQuery.order('sequence', { ascending: Boolean(after) }).limit(31),
    auth.supabase.from('profiles').select('id,display_name,is_verified,fb_username').eq('id', other).single(),
    conversation.listing_id ? auth.supabase.from('shoes').select('id,slug,seller_id,brand,model,price_php,is_negotiable,listing_type,status,has_stock,inventory_mode,shop_id,size_eu,size_us,size_cm,us_size_type,shops(*),shoe_variants(*)').eq('id', conversation.listing_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    auth.supabase.from('purchase_requests').select('*,shoe_variants(*)').eq('conversation_id', params.id).order('created_at', { ascending: false }).limit(20),
    auth.supabase.from('chat_blocks').select('blocker_id,blocked_id').in('blocker_id', [auth.profile.id, other]).in('blocked_id', [auth.profile.id, other]),
  ]);
  const readError = messages.error ?? partner.error ?? listing.error ?? requests.error ?? blocks.error;
  if (readError) return messagingError(readError);
  const rows = (messages.data ?? []).slice(0, 30);
  return NextResponse.json({ conversation, partner: partner.data, listing: listing.data, requests: requests.data ?? [],
    messages: after ? rows : rows.reverse(), has_more: (messages.data?.length ?? 0) > 30,
    blocked: Boolean(blocks.data?.length), blocked_by_me: blocks.data?.some(b => b.blocker_id === auth.profile.id) ?? false,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const parsed = sendSchema.safeParse(await smallJson(request).catch(() => null));
  if (!uuid.safeParse(params.id).success || !parsed.success) return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
  const { data, error } = await auth.supabase.rpc('chat_send', { p_conversation: params.id, p_body: parsed.data.body, p_client_id: parsed.data.client_id });
  if (error) return messagingError(error);
  return NextResponse.json({ message: data });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const parsed = actionSchema.safeParse(await smallJson(request).catch(() => null));
  if (!uuid.safeParse(params.id).success || !parsed.success) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  const action = parsed.data;
  const result = action.action === 'read' ? await auth.supabase.rpc('chat_mark_read', { p_conversation: params.id, p_sequence: action.sequence })
    : action.action === 'preferences' ? await auth.supabase.rpc('chat_preferences', { p_conversation: params.id, p_muted: action.muted ?? null, p_archived: action.archived ?? null })
    : action.action === 'block' ? await auth.supabase.rpc('chat_block', { p_conversation: params.id, p_block: action.blocked })
    : await auth.supabase.rpc('chat_report', { p_conversation: params.id, p_reason: action.reason });
  if (result.error) return messagingError(result.error);
  return NextResponse.json({ ok: true });
}
