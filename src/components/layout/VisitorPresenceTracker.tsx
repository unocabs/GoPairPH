'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'gopairph_visitor_id';
const HEARTBEAT_INTERVAL_MS = 60_000;

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const next = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function VisitorPresenceTracker() {
  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    let active = true;

    async function ping() {
      if (!active || document.visibilityState === 'hidden') return;
      try {
        await fetch('/api/visitor-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
          keepalive: true,
        });
      } catch {
        // Presence is nice-to-have; never interrupt browsing if it fails.
      }
    }

    ping();
    const interval = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', ping);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);

  return null;
}
