'use client';

import { useEffect } from 'react';

const VISITOR_KEY = 'gopairph_visitor_id';

function getVisitorId(): string | null {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;

    const next = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function ListingViewTracker({ listingId, shareToken }: { listingId: string; shareToken?: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const visitorId = getVisitorId();
      if (!visitorId) return;

      fetch('/api/listing-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          visitor_id: visitorId,
          ...(shareToken ? { share_token: shareToken } : {}),
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [listingId, shareToken]);

  return null;
}
