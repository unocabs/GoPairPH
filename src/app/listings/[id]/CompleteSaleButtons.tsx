'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CompleteSaleButtonsProps {
  requestId: string;
}

export function CompleteSaleButtons({ requestId }: CompleteSaleButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleComplete() {
    if (!confirm('Mark this sale as complete? The listing will become Sold and cannot be relisted.')) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('complete_purchase', { p_request_id: requestId });
    if (err) { setError(err.message); setLoading(false); return; }
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm('Cancel this sale? The listing will go back to Active and the buyer will be notified.')) return;
    setLoading(true);
    setError(null);
    const { error: err } = await createClient().rpc('cancel_purchase_acceptance', { p_request_id: requestId });
    if (err) { setError(err.message); setLoading(false); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleComplete}
          disabled={loading}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
        >
          Mark as Sold (Complete Sale)
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors disabled:opacity-50"
        >
          Cancel &amp; Reopen
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
