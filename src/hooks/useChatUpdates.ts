'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Share each topic across the navbar and inbox; Supabase shares one transport.
const topics = new Map<string, { listeners: Set<() => void>; stop: () => void }>();
function subscribe(topic: string, listener: () => void) {
  let entry = topics.get(topic);
  if (!entry) {
    const listeners = new Set<() => void>();
    const client = createClient();
    let channel: ReturnType<typeof client.channel> | null = null;
    let stopped = false;
    let connecting = false;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    const notify = () => { if (!document.hidden) listeners.forEach(fn => fn()); };
    const disconnect = () => { if (channel) void client.removeChannel(channel); channel = null; };
    const connect = async () => {
      if (channel || connecting || stopped || document.hidden) return;
      connecting = true;
      try {
        await client.realtime.setAuth();
        if (!stopped && !document.hidden) channel = client.channel(topic, { config: { private: true } })
          .on('broadcast', { event: 'changed' }, notify).subscribe((status: string) => { if (status === 'SUBSCRIBED') notify(); });
      } finally { connecting = false; }
    };
    const visibility = () => {
      clearTimeout(hiddenTimer);
      if (document.hidden) hiddenTimer = setTimeout(disconnect, 45_000);
      else { void connect().catch(() => {}); notify(); }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', visibility);
    // Reconcile on visible screens even if a realtime hint was missed.
    const poll = setInterval(() => { if (!document.hidden) { void connect().catch(() => {}); notify(); } }, 60_000);
    void connect().catch(() => {});
    entry = { listeners, stop: () => {
      stopped = true; clearTimeout(hiddenTimer); clearInterval(poll); disconnect();
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', visibility);
    } };
    topics.set(topic, entry);
  }
  entry.listeners.add(listener);
  return () => { entry!.listeners.delete(listener); if (!entry!.listeners.size) { entry!.stop(); topics.delete(topic); } };
}

export function useChatUpdates(topic: string | null, onChange: () => void) {
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => topic ? subscribe(topic, () => latest.current()) : undefined, [topic]);
}
