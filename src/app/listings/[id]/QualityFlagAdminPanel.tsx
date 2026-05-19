'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const QUALITY_FLAG_REASONS = [
  'Photo does not clearly show the actual shoes',
  'Photo is low quality, blurry, or too dark',
  'Photo is a screenshot, receipt, stock photo, or unrelated image',
  'Missing important shoe details',
  'Price, size, or condition looks unclear',
  'Duplicate or confusing listing',
];

interface QualityFlagAdminPanelProps {
  shoeId: string;
  flaggedAt: string | null;
  reasons: string[] | null;
  note: string | null;
}

export function QualityFlagAdminPanel({ shoeId, flaggedAt, reasons, note }: QualityFlagAdminPanelProps) {
  const initialReasons = useMemo(() => new Set((reasons ?? []).filter(Boolean)), [reasons]);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(initialReasons);
  const [adminNote, setAdminNote] = useState(note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isFlagged = !!flaggedAt;
  const disabled = pending || saving;

  function toggleReason(reason: string) {
    setSelectedReasons((current) => {
      const next = new Set(current);
      if (next.has(reason)) {
        next.delete(reason);
      } else {
        next.add(reason);
      }
      return next;
    });
  }

  async function saveFlag() {
    if (selectedReasons.size === 0 && !adminNote.trim()) {
      setError('Choose at least one reason or add a short note.');
      return;
    }

    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc('admin_flag_listing_quality', {
      p_listing_id: shoeId,
      p_reasons: Array.from(selectedReasons),
      p_note: adminNote.trim() || null,
    });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    startTransition(() => {
      setSaving(false);
      router.refresh();
    });
  }

  async function clearFlag() {
    if (!confirm('Clear the quality flag for this listing?')) return;

    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.rpc('admin_clear_listing_quality_flag', {
      p_listing_id: shoeId,
    });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setSelectedReasons(new Set());
    setAdminNote('');
    startTransition(() => {
      setSaving(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-200">Listing quality flag</p>
          {isFlagged && (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
              Flagged
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-5 text-gray-500">
          Use this when photos or details make the pair harder for buyers to trust. Buyers will not see the flag; the listing will rank lower until it improves.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {QUALITY_FLAG_REASONS.map((reason) => (
          <label
            key={reason}
            className="flex cursor-pointer gap-2 rounded-lg border border-white/[0.07] bg-slate-950/45 p-2.5 text-xs leading-5 text-gray-300 transition-colors hover:border-amber-300/25 hover:bg-amber-500/[0.04]"
          >
            <input
              type="checkbox"
              checked={selectedReasons.has(reason)}
              onChange={() => toggleReason(reason)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
            <span>{reason}</span>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Optional friendly note</span>
        <textarea
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          rows={3}
          placeholder="Example: Please upload a clearer photo of the actual pair instead of a screenshot."
          className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-sm leading-6 text-gray-100 placeholder-gray-600 outline-none transition-colors focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveFlag}
          disabled={disabled}
          className="rounded-lg border border-amber-300/45 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
        >
          {disabled ? 'Saving...' : isFlagged ? 'Update flag' : 'Flag listing'}
        </button>
        {isFlagged && (
          <button
            type="button"
            onClick={clearFlag}
            disabled={disabled}
            className="rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
          >
            Clear flag
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
