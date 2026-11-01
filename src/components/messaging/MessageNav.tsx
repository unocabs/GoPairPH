'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useChatUpdates } from '@/hooks/useChatUpdates';
import { messagingEnabled } from '@/lib/messaging/config';

export function MessageNav() {
  const { profile } = useSession();
  const [count, setCount] = useState(0);
  const fetching = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current || !profile?.id) return;
    fetching.current = true;
    try { const r = await fetch('/api/messages/unread', { cache: 'no-store' }); if (r.ok) setCount((await r.json()).count); }
    catch { /* Existing count remains while offline. */ }
    finally { fetching.current = false; }
  }, [profile?.id]);
  useChatUpdates(messagingEnabled && profile?.id ? `inbox:${profile.id}` : null, refresh);
  useEffect(() => { setCount(0); if (messagingEnabled) void refresh(); }, [refresh]);
  if (!messagingEnabled || !profile) return null;
  return <Link href="/messages" aria-label={`Messages${count ? `, ${count} unread conversations` : ''}`} className="relative inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H9l-6 4V6a2 2 0 012-2z" /></svg>
    <span className="hidden lg:inline">Messages</span>{count > 0 && <span className="rounded-full bg-teal-400 px-1.5 text-xs font-bold text-gray-950">{count > 99 ? '99+' : count}</span>}
  </Link>;
}
