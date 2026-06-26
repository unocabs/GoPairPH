'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DeleteListingButtonProps {
  shoeId: string;
  compact?: boolean;
}

export function DeleteListingButton({ shoeId, compact = false }: DeleteListingButtonProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRemove() {
    if (!confirm('Remove this listing from Go Pair PH?\n\nArchiving is different from marking a pair as sold. If you sold these shoes elsewhere, use "Mark Sold Outside Go Pair PH" instead so your listing history stays accurate.\n\nRemoving will hide the listing from buyers and may reverse GP Coins earned from this listing. Are you sure you want to archive it?')) return;
    setRemoving(true);
    setError(null);
    const supabase = createClient();

    // Keep the client-side check for a friendlier error before the RPC guard.
    const { data: completedSales, error: checkErr } = await supabase
      .from('purchase_requests')
      .select('id')
      .eq('listing_id', shoeId)
      .eq('status', 'completed')
      .limit(1);

    if (checkErr) {
      setError(checkErr.message);
      setRemoving(false);
      return;
    }
    if (completedSales && completedSales.length > 0) {
      setError('This shoe is part of a completed sale and can\'t be removed.');
      setRemoving(false);
      return;
    }

    const { error: archiveErr } = await supabase.rpc('archive_own_listing', {
      p_listing_id: shoeId,
    });
    if (archiveErr) {
      setError(archiveErr.message);
      setRemoving(false);
      return;
    }

    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={handleRemove}
        disabled={removing}
        className={compact
          ? 'flex w-full rounded-lg px-3 py-3 text-left text-base font-medium text-red-300 transition-colors hover:bg-red-950/70 disabled:opacity-50 sm:py-2 sm:text-sm'
          : 'rounded-lg border border-red-800 bg-transparent px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors disabled:opacity-50'}
      >
        {removing ? 'Removing...' : 'Remove Listing'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
