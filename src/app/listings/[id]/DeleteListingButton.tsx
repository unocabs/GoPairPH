'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DeleteListingButtonProps {
  shoeId: string;
  compact?: boolean;
}

export function DeleteListingButton({ shoeId, compact = false }: DeleteListingButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Delete this listing permanently? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();

    // Block deletion if the shoe is part of a completed sale — that record
    // would be cascade-deleted and purchase history would be lost.
    const { data: completedSales, error: checkErr } = await supabase
      .from('purchase_requests')
      .select('id')
      .eq('listing_id', shoeId)
      .eq('status', 'completed')
      .limit(1);

    if (checkErr) {
      setError(checkErr.message);
      setDeleting(false);
      return;
    }
    if (completedSales && completedSales.length > 0) {
      setError('This shoe is part of a completed sale and can\'t be deleted (purchase history would be lost).');
      setDeleting(false);
      return;
    }

    const { error: deleteErr } = await supabase.from('shoes').delete().eq('id', shoeId);
    if (deleteErr) {
      setError(deleteErr.message);
      setDeleting(false);
      return;
    }

    router.push('/profile');
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={compact
          ? 'flex w-full rounded-lg px-3 py-3 text-left text-base font-medium text-red-300 transition-colors hover:bg-red-950/70 disabled:opacity-50 sm:py-2 sm:text-sm'
          : 'rounded-lg border border-red-800 bg-transparent px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors disabled:opacity-50'}
      >
        {deleting ? 'Deleting…' : 'Delete Listing'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
