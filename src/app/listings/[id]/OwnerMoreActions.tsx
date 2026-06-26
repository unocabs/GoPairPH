'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DeleteListingButton } from './DeleteListingButton';
import type { ListingType, ListingStatus } from '@/types';

interface OwnerMoreActionsProps {
  shoeId: string;
  listingType: ListingType;
  status: ListingStatus;
}

export function OwnerMoreActions({ shoeId, listingType, status }: OwnerMoreActionsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canMarkDone = status === 'active' && (listingType === 'for_sale' || listingType === 'donate');
  const canRemove = status !== 'sold' && status !== 'archived';
  const hasActions = canMarkDone || canRemove;
  const doneStatus = listingType === 'donate' ? 'donated' : 'sold';
  const doneLabel = listingType === 'donate' ? 'Mark as Claimed' : 'Mark Sold Outside Go Pair PH';
  const doneHint = listingType === 'donate' ? 'Pair has been claimed' : 'Pair found its next runner';
  const confirmCopy = listingType === 'donate'
    ? 'This closes the listing and stops new free-pair requests. Nice, your pair found a new runner.'
    : 'This closes the listing and stops new buyer requests. Nice, your running shoes found their next runner.';

  async function handleMarkDone() {
    if (!confirm(`${doneLabel}?\n\n${confirmCopy}`)) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: shoeError } = await supabase
      .from('shoes')
      .update({ status: doneStatus })
      .eq('id', shoeId);

    if (shoeError) {
      setError(shoeError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from('purchase_requests')
      .update({ status: 'declined' })
      .eq('listing_id', shoeId)
      .in('status', ['pending', 'accepted']);

    router.push(`/listings/${shoeId}?closed=${doneStatus}`);
    router.refresh();
  }

  if (!hasActions) return null;

  return (
    <details className="relative w-full sm:w-auto">
      <summary className="list-none rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-center text-base font-medium text-gray-300 transition-colors cursor-pointer hover:bg-gray-800 hover:text-gray-100 sm:text-left sm:text-sm [&::-webkit-details-marker]:hidden">
        More Actions
      </summary>
      <div className="mt-2 w-full rounded-xl border border-gray-800 bg-slate-950 p-2 shadow-2xl shadow-black/40 sm:absolute sm:right-0 sm:z-20 sm:w-64">
        {canMarkDone && (
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={saving}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-gray-200 transition-colors hover:bg-gray-900 disabled:opacity-50 sm:py-2 sm:text-sm"
          >
            <span>{saving ? 'Saving...' : doneLabel}</span>
            <span className="text-xs text-gray-500">{doneHint}</span>
          </button>
        )}
        {canMarkDone && canRemove && <div className="my-2 h-px bg-gray-800" />}
        {canRemove && <DeleteListingButton shoeId={shoeId} compact />}
        {error && <p className="mt-2 px-3 text-xs text-red-400">{error}</p>}
      </div>
    </details>
  );
}
