import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_POST_SIGN_IN_PATH = '/browse';

export function getSafeNext(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return DEFAULT_POST_SIGN_IN_PATH;
  }

  return rawNext;
}

function isGuestListingDraftResume(path: string): boolean {
  try {
    const destination = new URL(path, 'https://gopairph.local');
    return (destination.pathname === '/listings/new' || destination.pathname === '/listings/new-v2')
      && destination.searchParams.get('resume') === 'draft';
  } catch {
    return false;
  }
}

function isSavedSearchResume(path: string): boolean {
  try {
    const destination = new URL(path, 'https://gopairph.local');
    return destination.pathname === '/browse' && destination.hash === '#save-search';
  } catch {
    return false;
  }
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
  // A guest has already completed step 1 and saved the details locally. Keep
  // this explicit continuation ahead of the normal active-seller dashboard
  // redirect so sign-in returns them to photo upload instead of /profile.
  if (isGuestListingDraftResume(fallbackPath) || isSavedSearchResume(fallbackPath)) return fallbackPath;

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
