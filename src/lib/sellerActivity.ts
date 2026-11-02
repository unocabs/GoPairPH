export const SELLER_ACTIVE_WINDOW_MS = 5 * 60 * 1000;
export const SELLER_ACTIVITY_HEARTBEAT_MS = 2 * 60 * 1000;

export function getSellerActivity(lastActiveAt: string | null | undefined, now: number) {
  if (!lastActiveAt) return null;
  const timestamp = Date.parse(lastActiveAt);
  // Missing, malformed, or future timestamps must not claim a seller is active.
  if (!Number.isFinite(timestamp) || timestamp > now) return null;
  const elapsed = now - timestamp;
  const activeNow = elapsed < SELLER_ACTIVE_WINDOW_MS;
  const minutes = Math.floor(elapsed / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const relative = activeNow ? 'now'
    : days >= 365 ? `${Math.floor(days / 365)}y ago`
    : days >= 30 ? `${Math.floor(days / 30)}mo ago`
    : days >= 1 ? `${days}d ago`
    : hours >= 1 ? `${hours}h ago`
    : `${minutes}m ago`;
  return { activeNow, relative, label: `Seller active ${relative}` };
}
