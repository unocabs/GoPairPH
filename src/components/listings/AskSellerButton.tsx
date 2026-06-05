'use client';

import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { trackMarketplaceAction } from '@/lib/analytics';

interface AskSellerButtonProps {
  contactUrl?: string | null;
  listingName: string;
  listingHref?: string;
  sellerName?: string | null;
  isShop?: boolean;
  buyerNeedsMessenger?: boolean;
  sendOfferLabel?: string;
  sendOfferHref?: string;
  onSendOffer?: () => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  ariaLabel?: string;
}

const QUESTION_PRESETS = [
  'Is this still available?',
  'Can I see more photos?',
  'Any issue with the sole?',
  'Where can you meet?',
  'Is the price negotiable?',
];

function getAbsoluteHref(href?: string): string | null {
  if (!href || typeof window === 'undefined') return null;
  return new URL(href, window.location.origin).toString();
}

export function AskSellerButton({
  contactUrl,
  listingName,
  listingHref,
  sellerName,
  isShop = false,
  buyerNeedsMessenger = false,
  sendOfferLabel = 'Send Offer',
  sendOfferHref,
  onSendOffer,
  className,
  style,
  children,
  ariaLabel,
}: AskSellerButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(QUESTION_PRESETS[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [contactOpened, setContactOpened] = useState(false);

  const message = useMemo(() => {
    const question = customMessage.trim() || selectedQuestion;
    const listingUrl = getAbsoluteHref(listingHref);
    return [
      `Hi${sellerName ? ` ${sellerName}` : ''}! I saw your ${listingName} on Go Pair PH. ${question}`,
      listingUrl ? `Listing: ${listingUrl}` : null,
    ].filter(Boolean).join('\n\n');
  }, [customMessage, listingHref, listingName, selectedQuestion, sellerName]);

  async function handleCopyAndOpen() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    setContactOpened(true);
    trackMarketplaceAction('outbound_click', {
      destination: contactUrl?.includes('facebook.com') || contactUrl?.includes('m.me') ? 'messenger_or_facebook' : 'seller_contact',
      surface: 'ask_seller_modal',
      is_shop: isShop,
    });
    if (contactUrl) window.open(contactUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleCopyListingLink() {
    const listingUrl = getAbsoluteHref(listingHref);
    if (!listingUrl) return;
    try {
      await navigator.clipboard.writeText(listingUrl);
      setLinkCopied(true);
      trackMarketplaceAction('copy_listing_link', {
        surface: 'ask_seller_modal',
        is_shop: isShop,
      });
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackMarketplaceAction('ask_seller_open', {
            has_contact: !!contactUrl,
            is_shop: isShop,
          });
          setOpen(true);
        }}
        className={className}
        style={style}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {children ?? 'Ask Seller'}
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-100">
                  {contactUrl ? 'Ask about this pair' : 'Messenger not added'}
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">{listingName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                aria-label="Close Ask Seller"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {contactUrl ? (
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">
                    Pick a quick question
                  </p>
                  <div className="mt-2 grid gap-2">
                    {QUESTION_PRESETS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          setSelectedQuestion(question);
                          setCustomMessage('');
                          setCopied(false);
                          setLinkCopied(false);
                          setContactOpened(false);
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                          selectedQuestion === question && !customMessage.trim()
                            ? 'border-teal-400/60 bg-teal-400/12 text-teal-100'
                            : 'border-white/[0.08] bg-slate-950/45 text-gray-300 hover:border-teal-400/35',
                        )}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Or write your own
                  </span>
                  <textarea
                    value={customMessage}
                    onChange={(event) => {
                      setCustomMessage(event.target.value);
                      setCopied(false);
                      setLinkCopied(false);
                      setContactOpened(false);
                    }}
                    rows={3}
                    placeholder="e.g. Available pa po? Can meet in Angeles?"
                    className="mt-2 w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </label>

                <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Message preview
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-300">{message}</p>
                </div>

                <div className="grid gap-2 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-3 text-xs leading-5 text-gray-300">
                  <p className="font-semibold text-teal-100">What happens next</p>
                  <p>1. Copy the message and send it to the {isShop ? 'shop' : 'seller'}.</p>
                  <p>2. Confirm condition, photos, meetup, delivery, or shipping.</p>
                  <p>3. Come back to Go Pair PH when you&apos;re ready to request or order.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
                  <p className="text-sm font-semibold text-amber-100">Messenger is not added yet.</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    This {isShop ? 'shop' : 'seller'} has not added a Messenger link. Send an offer on Go Pair PH so they can review the listing, price, and your contact details in one place.
                  </p>
                </div>
                {buyerNeedsMessenger && (
                  <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-3 text-xs leading-5 text-gray-300">
                    Add your Messenger when sending the offer so the seller knows where to reach you after accepting.
                  </div>
                )}
                <div className="rounded-xl border border-white/[0.08] bg-slate-950/45 p-3 text-xs leading-5 text-gray-400">
                  Keeping the offer on Go Pair PH helps both sides stay tied to the same pair, price, and listing status.
                </div>
              </div>
            )}

            <div className="border-t border-gray-800 p-4">
              {contactUrl && contactOpened && (
                <div className="mb-3 rounded-xl border border-teal-400/25 bg-teal-400/[0.07] p-3">
                  <p className="text-sm font-semibold text-teal-100">
                    {copied ? 'Message copied. Keep this listing handy.' : 'Contact opened. Keep this listing handy.'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-300">
                    Sending the request on Go Pair PH keeps the pair, price, and status tied to the deal.
                  </p>
                  {listingHref && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopyListingLink}
                        className="rounded-lg border border-white/[0.1] bg-slate-950/45 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-slate-900"
                      >
                        {linkCopied ? 'Link copied' : 'Copy link'}
                      </button>
                      <a
                        href={listingHref}
                        className="rounded-lg border border-teal-400/35 bg-teal-400/[0.08] px-3 py-2 text-center text-xs font-semibold text-teal-100 transition-colors hover:bg-teal-400/[0.12]"
                      >
                        View listing
                      </a>
                    </div>
                  )}
                </div>
              )}
              {contactUrl ? (
                <button
                  type="button"
                  onClick={handleCopyAndOpen}
                  className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  {contactOpened ? 'Copy message & open again' : 'Copy message & open contact'}
                </button>
              ) : onSendOffer ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    trackMarketplaceAction('request_start', {
                      listing_type: isShop ? 'shop_order' : 'offer',
                      surface: 'ask_seller_modal',
                    });
                    onSendOffer();
                  }}
                  className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  {sendOfferLabel}
                </button>
              ) : sendOfferHref ? (
                <a
                  href={sendOfferHref}
                  onClick={() => trackMarketplaceAction('request_start', {
                    listing_type: isShop ? 'shop_order' : 'offer',
                    surface: 'ask_seller_modal',
                  })}
                  className="flex w-full items-center justify-center rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  {sendOfferLabel}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/[0.1] bg-slate-950/45 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
