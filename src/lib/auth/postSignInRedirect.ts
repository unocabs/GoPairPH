import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_POST_SIGN_IN_PATH = '/browse';

export function getSafeNext(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return DEFAULT_POST_SIGN_IN_PATH;
  }

  return rawNext;
}

/**
 * Active sellers use their profile as a lightweight dashboard after sign-in.
 * Any lookup failure deliberately preserves the caller's contextual fallback so
 * authentication never becomes dependent on dashboard data being available.
 */
export async function resolvePostSignInPath(
  supabase: SupabaseClient,
  userId: string,
  fallbackPath: string,
): Promise<string> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !profile) return fallbackPath;

  const { data: activeListings, error: listingsError } = await supabase
    .from('shoes')
    .select('id')
    .eq('seller_id', profile.id)
    .eq('status', 'active')
    .limit(1);

  if (listingsError) return fallbackPath;
  return activeListings && activeListings.length > 0 ? '/profile' : fallbackPath;
}
