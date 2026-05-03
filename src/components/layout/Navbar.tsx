'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';

export function Navbar() {
  const { user, profile, loading } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

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
            <Link href="/wishlist" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors">
              Wishlist
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
                  className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-950"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      width={36}
                      height={36}
                      className="rounded-full border-2 border-gray-700 hover:border-teal-500 transition-colors"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(user.user_metadata?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-gray-700 bg-gray-900 py-1 shadow-xl shadow-black/50">
                      <div className="px-4 py-2 border-b border-gray-800 mb-1">
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100">
                        My Profile
                      </Link>
                      <Link href="/listings/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100">
                        List a Shoe
                      </Link>
                      {profile?.is_admin && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-gray-800">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Admin Dashboard
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
            <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Wishlist</Link>
            {user && (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">My Profile</Link>
                <Link href="/listings/new" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-teal-400 hover:bg-gray-800">+ List a Shoe</Link>
                {profile?.is_admin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-amber-400 hover:bg-gray-800">Admin Dashboard</Link>
                )}
                <button onClick={handleSignOut} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-400 hover:bg-gray-800">Sign Out</button>
              </>
            )}
            {!user && !loading && (
              <div className="px-3 py-2">
                <GoogleSignInButton />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
