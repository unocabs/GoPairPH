'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ListingType, ListingStatus } from '@/types';

interface StatusButtonProps {
  shoeId: string;
  currentStatus: ListingStatus;
  listingType: ListingType;
}

const MARK_LABELS: Record<ListingType, string> = {
  for_sale: 'Mark as Sold',
  donate: 'Mark as Donated',
};

const DONE_STATUS: Record<ListingType, ListingStatus> = {
  for_sale: 'sold',
  donate: 'donated',
};

const DONE_LABELS: Record<ListingStatus, string> = {
  sold: 'Sold',
  donated: 'Donated',
  active: 'Active',
  reserved: 'Reserved',
  archived: 'Archived',
};

export function StatusButton({ shoeId, currentStatus, listingType }: StatusButtonProps) {
  const [status, setStatus] = useState<ListingStatus>(currentStatus);

  async function handleMark() {
    const target = DONE_STATUS[listingType];
    if (!confirm(`Mark this listing as ${target}?`)) return;
    setStatus(target);
    await createClient().from('shoes').update({ status: target }).eq('id', shoeId);
  }

  async function handleRelist() {
    if (!confirm('Relist this item? It will become active and visible to buyers again.')) return;
    setStatus('active');
    await createClient().from('shoes').update({ status: 'active' }).eq('id', shoeId);
  }

  if (status === 'active') {
    return (
      <button
        onClick={handleMark}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
      >
        {MARK_LABELS[listingType]}
      </button>
    );
  }

  if (status === 'archived' || status === 'reserved') return null;

  // Sold is final — no relist (the listing was bought)
  const canRelist = status !== 'sold';

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm font-medium text-green-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {DONE_LABELS[status]}
      </span>
      {canRelist && (
        <button
          onClick={handleRelist}
          className="rounded-lg border border-gray-700 bg-transparent px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          Relist
        </button>
      )}
    </div>
  );
}
