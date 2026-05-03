'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate } from '@/lib/utils';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import type { VerificationRequest, Profile } from '@/types';

interface AdminDashboardProps {
  pending: VerificationRequest[];
  recent: VerificationRequest[];
  verified: Profile[];
}

type Tab = 'pending' | 'recent' | 'verified';

export function AdminDashboard({ pending, recent, verified }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('pending');

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {([
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'recent', label: `Recent reviews` },
          { key: 'verified', label: `Verified users (${verified.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingList requests={pending} />}
      {tab === 'recent' && <RecentList requests={recent} />}
      {tab === 'verified' && <VerifiedList users={verified} />}
    </div>
  );
}

function PendingList({ requests }: { requests: VerificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No pending requests. ✓</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {requests.map(req => <PendingCard key={req.id} request={req} />)}
    </div>
  );
}

function PendingCard({ request }: { request: VerificationRequest }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const router = useRouter();

  async function handle(action: 'approve' | 'reject') {
    if (action === 'reject' && notes.trim().length === 0) {
      if (!confirm('Reject without a reason? It\'s nicer to give the user feedback.')) return;
    }
    setLoading(true);
    const fn = action === 'approve' ? 'approve_verification' : 'reject_verification';
    const { error } = await createClient().rpc(fn, {
      p_request_id: request.id,
      p_notes: notes.trim() || null,
    });
    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
      return;
    }
    setDone(action === 'approve' ? 'approved' : 'rejected');
    setLoading(false);
    setTimeout(() => router.refresh(), 800);
  }

  if (done) {
    const cls = done === 'approved'
      ? 'border-green-800 bg-green-950 text-green-300'
      : 'border-gray-700 bg-gray-800 text-gray-400';
    return (
      <div className={`rounded-xl border ${cls} p-4 text-sm text-center`}>
        Request {done}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href={`/profile/${request.user_id}`}
          target="_blank"
          className="font-semibold text-gray-200 hover:text-teal-400"
        >
          {request.profiles?.display_name ?? 'Unknown user'}
        </Link>
        <span className="text-xs text-gray-500">{formatRelativeDate(request.created_at)}</span>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Submitted proof</p>
        <p className="text-sm text-gray-300 whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-800/40 p-3 break-words">
          {request.proof}
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Reason for rejection, or a note that goes into the audit log."
          className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handle('reject')}
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => handle('approve')}
          disabled={loading}
          className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
        >
          Approve &amp; Verify
        </button>
      </div>
    </div>
  );
}

function RecentList({ requests }: { requests: VerificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No reviews yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {requests.map(req => (
        <div key={req.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/profile/${req.user_id}`} target="_blank" className="text-sm font-medium text-gray-200 hover:text-teal-400">
              {req.profiles?.display_name ?? 'Unknown'}
            </Link>
            {req.admin_notes && (
              <p className="text-xs text-gray-500 italic truncate">&quot;{req.admin_notes}&quot;</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              req.status === 'approved'
                ? 'bg-green-950 text-green-400 border border-green-800'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}>
              {req.status}
            </span>
            <span className="text-xs text-gray-600">{req.reviewed_at ? formatRelativeDate(req.reviewed_at) : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerifiedList({ users }: { users: Profile[] }) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const router = useRouter();

  async function handleRevoke(profileId: string, name: string) {
    if (!confirm(`Revoke verification for ${name}? They'll lose the badge.`)) return;
    setRevoking(profileId);
    const { error } = await createClient().rpc('revoke_verification', { p_user_id: profileId });
    if (error) { alert('Error: ' + error.message); setRevoking(null); return; }
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No verified users yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/profile/${u.id}`} target="_blank" className="text-sm font-medium text-gray-200 hover:text-teal-400 inline-flex items-center gap-1.5">
              {u.display_name}
              <VerifiedBadge size="sm" />
            </Link>
            {u.location && <p className="text-xs text-gray-500">{u.location}</p>}
          </div>
          <button
            onClick={() => handleRevoke(u.id, u.display_name)}
            disabled={revoking === u.id}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {revoking === u.id ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      ))}
    </div>
  );
}
