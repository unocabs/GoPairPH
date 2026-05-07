'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { ContactSellerButtons } from '@/components/listings/ContactSellerButtons';
import type { Profile } from '@/types';

interface BuyModalProps {
  listingId: string;
  listingName: string;
  priceFormatted: string;
  pricePhp: number;
  isNegotiable: boolean;
  seller?: Profile;
  onClose: () => void;
  onSubmitted: () => void;
}

export function BuyModal({ listingId, listingName, priceFormatted, pricePhp, isNegotiable, seller, onClose, onSubmitted }: BuyModalProps) {
  const [message, setMessage] = useState('');
  const [bestOffer, setBestOffer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const offerNum = bestOffer.trim() ? parseFloat(bestOffer) : null;
    if (offerNum != null && (isNaN(offerNum) || offerNum <= 0)) {
      setError('Best offer must be a positive number.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          message: message.trim() || null,
          offer_price_php: isNegotiable ? offerNum : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to send request');
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="font-semibold text-gray-100">Request to Buy</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Item summary */}
          <div className="rounded-lg bg-gray-800 px-3 py-2.5 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">You&apos;re requesting to buy</p>
              <p className="text-sm font-medium text-gray-200 truncate">{listingName}</p>
              <p className="text-sm font-bold text-teal-400 mt-0.5">
                {priceFormatted}
                {isNegotiable && <span className="ml-1.5 text-xs font-normal text-amber-400">· Negotiable</span>}
              </p>
            </div>
          </div>

          {/* Seller card */}
          {seller && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-xs text-gray-500 mb-2">Seller</p>
              <div className="flex items-center gap-3">
                <Link href={`/profile/${seller.id}`} className="shrink-0" onClick={onClose}>
                  {seller.avatar_url ? (
                    <Image src={seller.avatar_url} alt={seller.display_name} width={40} height={40} className="rounded-full border border-gray-600" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                      {seller.display_name[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${seller.id}`} onClick={onClose} className="inline-flex items-center gap-1.5 font-semibold text-sm text-gray-200 hover:text-teal-400 transition-colors">
                    {seller.display_name}
                    {seller.is_verified && <VerifiedBadge size="sm" />}
                  </Link>
                  {seller.location && <p className="text-xs text-gray-500">{seller.location}</p>}
                </div>
              </div>
              {seller.fb_username && (
                <ContactSellerButtons fbUsername={seller.fb_username} listingId={listingId} />
              )}
            </div>
          )}

          {/* Best offer (only when negotiable) */}
          {isNegotiable && (
            <Input
              label="Your best offer (PHP)"
              type="number"
              min={1}
              step="any"
              placeholder={`e.g. ${Math.max(1, Math.round(pricePhp * 0.9))}`}
              hint="Optional — leave blank to offer the listed price. The seller will see your offer alongside their list price."
              value={bestOffer}
              onChange={e => setBestOffer(e.target.value)}
            />
          )}

          {/* Generalized notice */}
          <div className="rounded-lg bg-sky-950 border border-sky-800 px-3 py-2.5">
            <p className="text-xs text-sky-300">
              The seller will review your request. Once they accept, you can coordinate the deal directly —
              meetup, online payment, shipping, whatever works for both of you. The sale is finalized when the seller marks it as sold.
            </p>
          </div>

          <Textarea
            label="Message to the seller (optional)"
            rows={3}
            placeholder="Hi! I'd like to buy these. Are you open to a meetup, or would you prefer to ship?"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} className="flex-1">
            Send Purchase Request
          </Button>
        </div>
      </div>
    </div>
  );
}
