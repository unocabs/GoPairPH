'use client';

import { useSyncExternalStore } from 'react';
import { getSellerActivity } from '@/lib/sellerActivity';

// One local clock for every card; no per-card polling or network subscriptions.
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
function tick() {
  now = Date.now();
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, 60_000);
    document.addEventListener('visibilitychange', tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    }
  };
}
const getSnapshot = () => now;
const getServerSnapshot = () => 0;

export function SellerActivity({ lastActiveAt, fallback, mutedColor }: {
  lastActiveAt?: string | null;
  fallback: string;
  mutedColor?: string;
}) {
  const currentTime = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const activity = currentTime ? getSellerActivity(lastActiveAt, currentTime) : null;

  return (
    <p
      className="mt-1.5 flex h-4 min-w-0 items-center gap-1 text-xs leading-4 text-gray-400"
      style={mutedColor ? { color: mutedColor } : undefined}
      title={activity ? `${activity.label} on Go Pair PH. ${fallback}` : fallback}
      aria-label={activity?.label}
    >
      {activity ? <>
        <span aria-hidden="true" className={`h-1 w-1 shrink-0 rounded-full ${activity.activeNow ? 'bg-emerald-400' : 'bg-gray-500'}`} />
        <span className="truncate" aria-hidden="true">
          <span className="sm:hidden">Seller · {activity.relative}</span>
          <span className="hidden sm:inline">{activity.label}</span>
        </span>
      </> : <span className="truncate">{fallback}</span>}
    </p>
  );
}
