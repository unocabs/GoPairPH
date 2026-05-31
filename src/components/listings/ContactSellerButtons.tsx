'use client';

import { buildMessengerUrl } from '@/lib/facebook';
import { AskSellerButton } from './AskSellerButton';

interface ContactSellerButtonsProps {
  fbUsername?: string | null;
  listingName: string;
  listingHref: string;
  sellerName?: string | null;
  buyerNeedsMessenger?: boolean;
}

export function ContactSellerButtons({
  fbUsername,
  listingName,
  listingHref,
  sellerName,
  buyerNeedsMessenger = false,
}: ContactSellerButtonsProps) {
  const messengerUrl = buildMessengerUrl(fbUsername);

  return (
    <AskSellerButton
      contactUrl={messengerUrl}
      listingName={listingName}
      listingHref={listingHref}
      sellerName={sellerName}
      buyerNeedsMessenger={buyerNeedsMessenger}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
      ariaLabel={messengerUrl ? 'Message seller on Messenger' : 'Seller has not added Messenger'}
    >
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.91 1.451 5.503 3.717 7.197V22l3.398-1.866c.907.251 1.872.385 2.885.385 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.994 12.46l-2.546-2.717-4.969 2.717 5.466-5.81 2.61 2.717 4.905-2.717-5.466 5.81z" />
      </svg>
      Message Seller
    </AskSellerButton>
  );
}
