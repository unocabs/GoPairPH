import { NextResponse } from 'next/server';
import { messagingUser, messagingUnavailable, messagingError } from '@/lib/messaging/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const auth = await messagingUser();
  if (!auth) return messagingUnavailable();
  const { data, error } = await auth.supabase.rpc('chat_unread_count');
  if (error) return messagingError(error);
  return NextResponse.json({ count: data ?? 0 }, { headers: { 'Cache-Control': 'private, no-store' } });
}
