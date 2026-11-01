import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function messagingUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  return profile ? { supabase, profile: profile as { id: string } } : null;
}

export function messagingUnavailable() {
  return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function smallJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid request');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12_000) { await reader.cancel(); throw new Error('Request too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function messagingError(error: { message?: string; code?: string }) {
  if (['42883', '42P01', 'PGRST202'].includes(error.code ?? '')) {
    return NextResponse.json({ error: 'Chat is being set up. Please try again shortly.' }, { status: 503 });
  }
  const message = error.code === 'P0001' ? error.message ?? 'Could not complete this action.' : 'Could not complete this action. Please try again.';
  const limited = /try again in a minute|try again later/i.test(message);
  return NextResponse.json({ error: message }, { status: limited ? 429 : 400, headers: limited ? { 'Retry-After': '60' } : {} });
}
