'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatShortDate } from '@/lib/utils';

interface SponsoredAdminToggleProps {
  shoeId: string;
  sponsoredUntil: string | null;
  status: string;
  sellerIsVerified: boolean;
}

const DURATIONS: { label: string; days: number }[] = [
  { label: '7d (₱30)', days: 7 },
  { label: '30d (₱100)', days: 30 },
];

/**
 * Admin-only control to flip sponsored_until for a listing. Use after
 * confirming the seller's payment via Messenger / GCash receipt.
 */
export function SponsoredAdminToggle({ shoeId, sponsoredUntil: initial, status, sellerIsVerified }: SponsoredAdminToggleProps) {
  const [until, setUntil] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isActive = !!until && new Date(until) > new Date();
  const disabled = pending || (status !== 'active' && !isActive);

  async function activate(days: number) {
    if (!sellerIsVerified && !confirm('This seller is not verified. Continue anyway?')) return;
    if (!confirm(`Activate ${days}-day Top Pick for this listing?`)) return;
    setError(null);
    const supabase = createClient();
    const newUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from('shoes')
      .update({
        sponsored_until: newUntil,
        sponsored_started_at: new Date().toISOString(),
      })
      .eq('id', shoeId)
      .select('id, sponsored_until');

    if (err) {
      setError(err.message);
      return;
    }
    if (!data || data.length === 0) {
      setError('Update blocked. Make sure your profile has is_admin = true.');
      return;
    }
    setUntil(data[0].sponsored_until ?? newUntil);
    startTransition(() => router.refresh());
  }

  async function clear() {
    if (!confirm('Clear the Top Pick slot for this listing?')) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('shoes')
      .update({ sponsored_until: null, sponsored_started_at: null })
      .eq('id', shoeId);
    if (err) {
      setError(err.message);
      return;
    }
    setUntil(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {isActive ? (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 11l18-7-7 18-2.5-7.5L3 11z" />
            </svg>
            {pending ? 'Saving…' : 'Top Pick · Click to clear'}
          </button>
          {until && (
            <span className="text-[11px] text-amber-400">
              Top Pick until {formatShortDate(until)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] text-gray-500 self-center mr-1">Activate Top Pick for:</span>
          {DURATIONS.map(({ label, days }) => (
            <button
              key={days}
              type="button"
              onClick={() => activate(days)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-transparent px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
