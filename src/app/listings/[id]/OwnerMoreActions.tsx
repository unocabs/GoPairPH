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
  const doneStatus = listingType === 'donate' ? 'donated' : 'sold';
  const doneLabel = listingType === 'donate' ? 'Mark as Donated' : 'Mark as Sold';
  const confirmCopy = listingType === 'donate'
    ? 'Use this if the pair has already been given away. This will remove it from the active marketplace.'
    : 'Use this if the pair was sold outside Go Pair PH, such as on Facebook, Messenger, Marketplace, or in person. This will remove it from the active marketplace.';

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

    router.push('/profile?tab=sales');
    router.refresh();
  }

  return (
    <details className="relative">
      <summary className="list-none rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors cursor-pointer [&::-webkit-details-marker]:hidden">
        More Actions
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-800 bg-slate-950 p-2 shadow-2xl shadow-black/40">
        {canMarkDone && (
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={saving}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-200 transition-colors hover:bg-gray-900 disabled:opacity-50"
          >
            <span>{saving ? 'Saving...' : doneLabel}</span>
            <span className="text-xs text-gray-500">{listingType === 'donate' ? 'Given away' : 'Outside sale'}</span>
          </button>
        )}
        <div className="my-2 h-px bg-gray-800" />
        <DeleteListingButton shoeId={shoeId} compact />
        {error && <p className="mt-2 px-3 text-xs text-red-400">{error}</p>}
      </div>
    </details>
  );
}
