'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SELLER_ACTIVITY_HEARTBEAT_MS } from '@/lib/sellerActivity';

export function SellerActivityHeartbeat({ userId }: { userId?: string }) {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let lastAttempt = 0;
    let pending = false;
    let stopped = false;
    let unavailable = false;

    async function heartbeat() {
      if (stopped || unavailable || pending || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastAttempt < SELLER_ACTIVITY_HEARTBEAT_MS) return;
      lastAttempt = now;
      pending = true;
      try {
        const { error } = await supabase.rpc('record_profile_activity');
        // Keep the marketplace working quietly before migration 063 is applied.
        if (error?.code === 'PGRST202' || error?.code === '42883') unavailable = true;
      } catch {
        // Activity must never block browsing, authentication, or messaging.
      } finally {
        pending = false;
      }
    }

    void heartbeat();
    const timer = setInterval(() => { void heartbeat(); }, SELLER_ACTIVITY_HEARTBEAT_MS);
    document.addEventListener('visibilitychange', heartbeat);
    window.addEventListener('focus', heartbeat);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', heartbeat);
      window.removeEventListener('focus', heartbeat);
    };
  }, [userId]);

  return null;
}
