'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSellerButton } from './MessageSellerButton';
import { BuyButton } from '@/components/purchases/BuyButton';
import { DonateRequestButton } from '@/components/purchases/DonateRequestButton';
import Link from 'next/link';
import type { Shoe } from '@/types';
import { formatPrice, formatListingName } from '@/lib/utils';

export function StickyListingActions({ listing, contactUrl, profileId }: { listing: Shoe; contactUrl: string | null; profileId: string | null }) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const submitted = (conversationId?: string) => router.push(conversationId ? `/messages?conversation=${conversationId}` : '/buying?tab=offers');
  useEffect(() => {
    const anchor = document.getElementById('listing-mobile-actions'); if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 80), { threshold: 0 });
    observer.observe(anchor); return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  const name = formatListingName(listing.brand, listing.model);
  const buttonStyle = 'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-500 px-3 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400';
  return <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-gray-700 bg-gray-950/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
    <MessageSellerButton href={`/messages?listing=${listing.id}`} messengerUrl={contactUrl} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-100" />
    {!profileId ? <Link href={`/auth/sign-in?next=${encodeURIComponent(`/listings/${listing.slug ?? listing.id}`)}`} className={buttonStyle}>Sign in to {listing.listing_type === 'donate' ? 'request' : 'offer'}</Link> : listing.listing_type === 'donate' ? <DonateRequestButton listingId={listing.id} listingName={name} requesterId={profileId} onSubmitted={submitted} /> : <BuyButton listingId={listing.id} listingName={name} priceFormatted={formatPrice(listing.price_php!)} pricePhp={listing.price_php!} isNegotiable={listing.is_negotiable} shop={listing.shops} variants={listing.inventory_mode === 'multi' ? listing.shoe_variants : undefined} buyerProfileId={profileId} showOfferCount={false} onSubmitted={submitted} className={buttonStyle} />}
  </div>;
}
