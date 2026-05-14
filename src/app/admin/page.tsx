export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';
import { getDashboardViewWindow, getListingViewSummaries } from '@/lib/listingViews';
import type { VerificationRequest, Profile, Shop } from '@/types';

async function loadAdminData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) return null;

  const viewWindow = getDashboardViewWindow();
  const [pendingRes, recentRes, verifiedRes, shopsRes, profilesRes, listingViews] = await Promise.all([
    supabase
      .from('verification_requests')
      .select('*, profiles:profiles!user_id(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('verification_requests')
      .select('*, profiles:profiles!user_id(*)')
      .in('status', ['approved', 'rejected'])
      .order('reviewed_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .eq('is_verified', true)
      .order('display_name'),
    supabase
      .from('shops')
      .select('*, owner:profiles!shops_owner_profile_id_fkey(id, display_name, location)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, user_id, display_name, location, avatar_url, fb_username, is_verified, is_admin, created_at, updated_at')
      .order('display_name'),
    getListingViewSummaries({ ...viewWindow, limit: 100 }),
  ]);

  return {
    pending: (pendingRes.data as VerificationRequest[]) ?? [],
    recent: (recentRes.data as VerificationRequest[]) ?? [],
    verified: (verifiedRes.data as Profile[]) ?? [],
    shops: (shopsRes.data as (Shop & { owner?: Pick<Profile, 'id' | 'display_name' | 'location'> | null })[]) ?? [],
    profiles: (profilesRes.data as Profile[]) ?? [],
    listingViews,
    viewWindow,
  };
}

export default async function AdminPage() {
  const data = await loadAdminData();
  if (!data) redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Review verification requests, manage verified users, and maintain shops.</p>
      </header>
      <AdminDashboard {...data} />
    </div>
  );
}
