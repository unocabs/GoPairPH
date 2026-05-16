'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { ShopsDropdown } from '@/components/layout/ShopsDropdown';

export function Navbar() {
  const { user, profile, loading } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [sentOffersCount, setSentOffersCount] = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [ownedShopSlug, setOwnedShopSlug] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch pending purchase-request count for the signed-in seller.
  // Re-runs on session change and on route change (so accepting/declining a
  // request on /profile updates the badge after the page navigates).
  useEffect(() => {
    let active = true;
    if (!profile?.id) {
      setPendingRequestCount(0);
      setSentOffersCount(0);
      setAdminPendingCount(0);
      setOwnedShopSlug(null);
      return;
    }
    (async () => {
      // Count pending requests on listings where I'm the seller.
      const { data: myShoes } = await supabase
        .from('shoes')
        .select('id')
        .eq('seller_id', profile.id);
      if (!active) return;
      const ids = (myShoes ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) {
        setPendingRequestCount(0);
      } else {
        const { count } = await supabase
          .from('purchase_requests')
          .select('id', { count: 'exact', head: true })
          .in('listing_id', ids)
          .eq('status', 'pending');
        if (active) setPendingRequestCount(count ?? 0);
      }

      // Count my outgoing offers (pending) + reservations (accepted).
      const { count: outgoingCount } = await supabase
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', profile.id)
        .in('status', ['pending', 'accepted']);
      if (active) setSentOffersCount(outgoingCount ?? 0);

      // Admin-only: count pending verification requests waiting for review.
      if (profile.is_admin) {
        const { count: adminCount } = await supabase
          .from('verification_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (active) setAdminPendingCount(adminCount ?? 0);
      } else if (active) {
        setAdminPendingCount(0);
      }

      const { data: ownedShop } = await supabase
        .from('shops')
        .select('slug')
        .eq('owner_profile_id', profile.id)
        .maybeSingle();
      if (active) setOwnedShopSlug(ownedShop?.slug ?? null);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    setMenuOpen(false);
  }

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/browse" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
              Browse
            </Link>
            <ShopsDropdown />
            <Link href="/guides" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
              Guides
            </Link>
            <Link href="/find-my-pair" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
              Find My Pair
            </Link>
            {user && (
              <Link href="/listings/new" className="ml-2">
                <Button size="sm">+ List a Shoe</Button>
              </Link>
            )}
          </div>

          {/* Right side — avatar always visible; hamburger mobile-only */}
          <div className="flex items-center gap-2">
            {/* Avatar / auth */}
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-800" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="relative flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-950"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Avatar
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || user.email || 'Avatar'}
                      size={36}
                      className={`border-2 transition-colors ${
                        adminPendingCount > 0
                          ? 'border-amber-400 ring-2 ring-amber-400/40 ring-offset-2 ring-offset-gray-950 hover:border-amber-300'
                          : 'border-gray-700 hover:border-teal-500'
                      }`}
                    />
                  ) : (
                    <div
                      className={`h-9 w-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm ${
                        adminPendingCount > 0 ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-950' : ''
                      }`}
                    >
                      {(user.user_metadata?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                  {/* Avatar dot — signals pending requests or active sent offers */}
                  {(pendingRequestCount + sentOffersCount) > 0 && (
                    <span
                      aria-label={`${pendingRequestCount + sentOffersCount} items need attention`}
                      className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sky-500 border-2 border-gray-950"
                    />
                  )}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/50">
                      <div className="px-4 py-2 border-b border-gray-800 mb-1">
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                      >
                        My Profile
                      </Link>
                      {ownedShopSlug && (
                        <Link
                          href="/shop/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-300 hover:bg-gray-800 hover:text-teal-200"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7l1 13h12l1-13M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                          Shop Dashboard
                        </Link>
                      )}
                      {/* Purchase Requests — only when there are pending ones */}
                      {pendingRequestCount > 0 && (
                        <Link
                          href="/profile?tab=purchases"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Purchase Requests
                          </span>
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums bg-sky-500 text-white">
                            {pendingRequestCount}
                          </span>
                        </Link>
                      )}
                      {/* Sent Offers — only when there are pending or reserved ones */}
                      {sentOffersCount > 0 && (
                        <Link
                          href="/profile?tab=offers"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Sent Offers
                          </span>
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums bg-sky-500 text-white">
                            {sentOffersCount}
                          </span>
                        </Link>
                      )}
                      {profile?.is_admin && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-gray-800"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin Dashboard
                          </span>
                          {adminPendingCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums bg-amber-500 text-gray-950">
                              {adminPendingCount}
                            </span>
                          )}
                        </Link>
                      )}
                      <hr className="my-1 border-gray-800" />
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800">
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: compact sign-in button */}
                <button
                  onClick={handleSignIn}
                  className="md:hidden flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign In
                </button>
                {/* Desktop: full Google button */}
                <div className="hidden md:block w-52">
                  <GoogleSignInButton />
                </div>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-800 py-3 flex flex-col gap-1">
            <Link href="/browse" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Browse</Link>
            <Link href="/shop" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Shops</Link>
            <Link href="/guides" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Guides</Link>
            <Link href="/find-my-pair" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Find My Pair</Link>
            {user && (
              <>
                <Link href="/listings/new" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-teal-400 hover:bg-gray-800">+ List a Shoe</Link>
                {ownedShopSlug && (
                  <Link href="/shop/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-teal-300 hover:bg-gray-800">Shop Dashboard</Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
