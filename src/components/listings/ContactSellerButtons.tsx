'use client';

import { buildMessengerUrl } from '@/lib/facebook';
import { AskSellerButton } from './AskSellerButton';
import { messagingEnabled } from '@/lib/messaging/config';

interface ContactSellerButtonsProps {
  listingId: string;
  fbUsername?: string | null;
  listingName: string;
  listingHref: string;
  sellerName?: string | null;
  buyerNeedsMessenger?: boolean;
}

export function ContactSellerButtons({
  listingId,
  fbUsername,
  listingName,
  listingHref,
  sellerName,
  buyerNeedsMessenger = false,
}: ContactSellerButtonsProps) {
  const messengerUrl = buildMessengerUrl(fbUsername);

  return (
    <AskSellerButton
      listingId={listingId}
      contactUrl={messengerUrl}
      listingName={listingName}
      listingHref={listingHref}
      sellerName={sellerName}
      buyerNeedsMessenger={buyerNeedsMessenger}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
      ariaLabel={messagingEnabled ? 'Message seller' : messengerUrl ? 'Message seller on Messenger' : 'Seller has not added Messenger'}
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
      Message Seller
    </AskSellerButton>
  );
}
