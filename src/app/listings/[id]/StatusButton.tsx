'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ListingType, ListingStatus } from '@/types';

interface StatusButtonProps {
  shoeId: string;
  currentStatus: ListingStatus;
  listingType: ListingType;
}

const DONE_LABELS: Record<ListingStatus, string> = {
  sold: 'Sold',
  donated: 'Claimed',
  active: 'Active',
  reserved: 'Reserved',
  archived: 'Archived',
};

export function StatusButton({ shoeId, currentStatus }: StatusButtonProps) {
  const [status, setStatus] = useState<ListingStatus>(currentStatus);

  async function handleRelist() {
    if (!confirm('Relist this item? It will become active and visible to buyers again.')) return;
    setStatus('active');
    await createClient().from('shoes').update({ status: 'active', closed_sale_channel: null }).eq('id', shoeId);
  }

  // Active listings get marked sold/claimed through the Purchase Request flow,
  // not via a manual button — keeps buyer/seller history intact.
  if (status === 'active' || status === 'archived' || status === 'reserved') return null;

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
