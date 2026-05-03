'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface DonateRequestModalProps {
  listingId: string;
  listingName: string;
  requesterId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function DonateRequestModal({ listingId, listingName, requesterId, onClose, onSubmitted }: DonateRequestModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const { error: err } = await createClient().from('purchase_requests').insert({
      listing_id: listingId,
      buyer_id: requesterId,
      message: message.trim() || null,
      offer_price_php: null,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    onSubmitted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="font-semibold text-gray-100">Request this Pair</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="rounded-lg bg-gray-800 px-3 py-2.5">
            <p className="text-xs text-gray-500">You&apos;re requesting</p>
            <p className="text-sm font-medium text-gray-200 truncate">{listingName}</p>
            <p className="text-sm font-bold text-green-400 mt-0.5">Free Donation</p>
          </div>

          <div className="rounded-lg bg-green-950 border border-green-800 px-3 py-2.5">
            <p className="text-xs text-green-300">
              The donor will review your request and reach out to arrange a pickup. Be respectful — donations are a gift from a fellow runner!
            </p>
          </div>

          <Textarea
            label="Message to the donor (optional)"
            rows={3}
            placeholder="Hi! I'd love to give these shoes a good home. I'm based in..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} className="flex-1">
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
}
