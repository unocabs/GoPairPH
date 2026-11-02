import 'server-only';
import { createPublicClient } from '@/lib/supabase/server';

// Homepage profiles use a narrow cached select. Fetch just the displayed sellers
// together so activity stays fresh without invalidating listing/image caches.
export async function getSellerActivityById(sellerIds: string[]): Promise<Record<string, string | null>> {
  const ids = [...new Set(sellerIds)];
  if (ids.length === 0) return {};
  try {
    const { data, error } = await createPublicClient()
      .from('profiles')
      .select('id, last_active_at')
      .in('id', ids);
    // An unapplied migration must not hide the existing homepage listings.
    if (error) return {};
    return Object.fromEntries((data ?? []).map(profile => [profile.id, profile.last_active_at]));
  } catch {
    return {};
  }
}
