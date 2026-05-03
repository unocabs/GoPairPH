export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';
import type { VerificationRequest, Profile } from '@/types';

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

  const [pendingRes, recentRes, verifiedRes] = await Promise.all([
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
  ]);

  return {
    pending: (pendingRes.data as VerificationRequest[]) ?? [],
    recent: (recentRes.data as VerificationRequest[]) ?? [],
    verified: (verifiedRes.data as Profile[]) ?? [],
  };
}

export default async function AdminPage() {
  const data = await loadAdminData();
  if (!data) redirect('/');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Review verification requests and manage verified users.</p>
      </header>
      <AdminDashboard {...data} />
    </div>
  );
}
