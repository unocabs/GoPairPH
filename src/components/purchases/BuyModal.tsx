'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { VariantSelector } from '@/components/listings/VariantSelector';
import { SafeShopImage } from '@/components/shop/SafeShopImage';
import { BuyerContactPrompt } from './BuyerContactPrompt';
import { trackMarketplaceAction } from '@/lib/analytics';
import { getPublicUrl } from '@/lib/utils';
import { getFacebookContactUrl } from '@/lib/facebook';
import type { Profile, ShoeVariant, Shop } from '@/types';

const OFFER_MESSAGE_CHIPS = [
  'Is this still available?',
  'Can meet in Pampanga',
  'Can ship?',
  'Price negotiable?',
];

const ORDER_MESSAGE_CHIPS = [
  'Is this size available?',
  'Can pick up',
  'Can deliver?',
  'How do I pay?',
];

interface BuyModalProps {
  listingId: string;
  listingSlug?: string | null;
  listingName: string;
  priceFormatted: string;
  pricePhp: number;
  isNegotiable: boolean;
  seller?: Profile;
  shop?: Shop | null;
  /** When provided, the buyer must pick a size before submitting. */
  variants?: ShoeVariant[];
  /** Pre-selected variant id (e.g. user clicked "Buy this size" on the detail page). */
  initialVariantId?: string | null;
  buyerProfileId?: string | null;
  buyerFbUsername?: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function BuyModal({ listingId, listingName, priceFormatted, pricePhp, isNegotiable, seller, shop, variants, initialVariantId, buyerProfileId, buyerFbUsername, onClose, onSubmitted }: BuyModalProps) {
  const [message, setMessage] = useState('');
  const [bestOffer, setBestOffer] = useState('');
  const [variantId, setVariantId] = useState<string | null>(initialVariantId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showVariantSelector = !!variants && variants.length > 0;
  const availableVariants = useMemo(
    () => (variants ?? []).filter(v => v.quantity > 0).sort((a, b) => a.size_eu - b.size_eu),
    [variants],
  );
  const isShopOrder = !!shop;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const shopLogoUrl = shop?.logo_storage_path ? getPublicUrl(supabaseUrl, shop.logo_storage_path, 'shop-logos') : null;
  const shopFacebookUrl = getFacebookContactUrl(shop?.fb_page_url);
  const submitDisabled = showVariantSelector && availableVariants.length === 0;
  const actionLabel = isShopOrder ? 'Place Order' : 'Send Offer';
  const titleLabel = isShopOrder ? 'Place your order' : 'Send your offer';
  const summaryLabel = isShopOrder
    ? 'Order request'
    : 'Offer request';
  const messageChips = isShopOrder ? ORDER_MESSAGE_CHIPS : OFFER_MESSAGE_CHIPS;

  useEffect(() => {
    if (!showVariantSelector) return;
    if (variantId && availableVariants.some(v => v.id === variantId)) return;
    setVariantId(availableVariants[0]?.id ?? null);
  }, [availableVariants, showVariantSelector, variantId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    if (showVariantSelector && availableVariants.length === 0) {
      setError('This listing is currently out of stock.');
      setSubmitting(false);
      return;
    }

    if (showVariantSelector && (!variantId || !availableVariants.some(v => v.id === variantId))) {
      setError('Please pick a size.');
      setSubmitting(false);
      return;
    }

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
          variant_id: variantId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to send request');
      }
      trackMarketplaceAction('request_submit', {
        listing_id: listingId,
        listing_type: isShopOrder ? 'shop_order' : isNegotiable ? 'offer' : 'buy_request',
        has_message: message.trim().length > 0,
        has_offer_price: offerNum != null,
        selected_variant: !!variantId,
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-100">{titleLabel}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isShopOrder ? 'The shop confirms first. No payment happens here.' : 'The seller reviews first. No payment happens here.'}
            </p>
          </div>
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
              <p className="text-xs text-gray-500">{summaryLabel}</p>
              <p className="text-sm font-medium text-gray-200 truncate">{listingName}</p>
              <p className="text-sm font-bold text-teal-400 mt-0.5">
                {priceFormatted}
                {isNegotiable && <span className="ml-1.5 text-xs font-normal text-amber-400">· Negotiable</span>}
              </p>
            </div>
          </div>

          {/* Seller card */}
          {isShopOrder && shop ? (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-xs text-gray-500 mb-2">Shop</p>
              <div className="flex items-center gap-3">
                <Link href={`/shop/${shop.slug}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-600 bg-gray-900" onClick={onClose}>
                  <SafeShopImage src={shopLogoUrl} alt={shop.name} className="h-full w-full object-cover" logoSize={32} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/shop/${shop.slug}`} onClick={onClose} className="font-semibold text-sm text-gray-200 hover:text-teal-400 transition-colors">
                    {shop.name}
                  </Link>
                  {shop.location && <p className="text-xs text-gray-500">{shop.location}</p>}
                </div>
              </div>
              {shopFacebookUrl && (
                <a
                  href={shopFacebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackMarketplaceAction('outbound_click', {
                    destination: 'shop_facebook',
                    listing_id: listingId,
                    surface: 'request_modal',
                  })}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                  </svg>
                  Verify shop on Facebook
                </a>
              )}
            </div>
          ) : seller && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-xs text-gray-500 mb-2">Seller</p>
              <div className="flex items-center gap-3">
                <Link href={`/profile/${seller.id}`} className="shrink-0" onClick={onClose}>
                  <Avatar
                    src={seller.avatar_url}
                    alt={seller.display_name}
                    size={40}
                    className="border border-gray-600"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${seller.id}`} onClick={onClose} className="inline-flex items-center gap-1.5 font-semibold text-sm text-gray-200 hover:text-teal-400 transition-colors">
                    {seller.display_name}
                    {seller.is_verified && <VerifiedBadge size="sm" />}
                  </Link>
                  {seller.location && <p className="text-xs text-gray-500">{seller.location}</p>}
                </div>
              </div>
            </div>
          )}

          {showVariantSelector && variants && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
              <VariantSelector variants={variants} selectedId={variantId} onSelect={setVariantId} />
            </div>
          )}

          {/* Best offer (only when negotiable) */}
          {isNegotiable && (
            <Input
              label="Offer price (PHP)"
              type="number"
              min={1}
              step="any"
              placeholder={`e.g. ${Math.max(1, Math.round(pricePhp * 0.9))}`}
              hint="Optional. Leave blank if you want to offer the listed price."
              value={bestOffer}
              onChange={e => setBestOffer(e.target.value)}
            />
          )}

          {/* Generalized notice */}
          <div className="rounded-lg border border-sky-800/60 bg-sky-950/55 px-3 py-2.5">
            <p className="text-xs leading-5 text-sky-300">
              {isShopOrder
                ? 'The shop reviews your order first. Pay only after they confirm stock, payment, and delivery details.'
                : 'The seller reviews your offer first. Coordinate meetup, payment, or shipping only after they accept.'}
            </p>
            {isShopOrder && (
              <p className="mt-1.5 text-xs text-sky-200">
                Keep screenshots for your records. Read the{' '}
                <a href="https://gopairph.com/safety" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                  Go Pair PH Safety Guide
                </a>.
              </p>
            )}
          </div>

          <BuyerContactPrompt profileId={buyerProfileId} initialFbUsername={buyerFbUsername} />

          <div className="space-y-2">
            <Textarea
              label={isShopOrder ? 'Notes for the shop (optional)' : 'Message to seller (optional)'}
              rows={3}
              placeholder={isShopOrder
                ? 'Preferred payment, pickup, delivery, or shipping details.'
                : 'Ask about availability, meetup, shipping, or condition.'}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {messageChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMessage(chip)}
                  className="rounded-full border border-white/[0.08] bg-slate-950/45 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition-colors hover:border-teal-400/35 hover:text-teal-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} disabled={submitDisabled} className="flex-1">
            {submitDisabled ? 'Out of Stock' : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
