'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingShareActions } from '@/components/listings/ListingShareActions';
import { Button } from '@/components/ui/Button';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { Profile, Shoe } from '@/types';

export function ListingV2ShareStep({ shoe, seller }: { shoe: Shoe; seller: Profile | null }) {
  const router = useRouter();
  const completionKey = `gopairph:new-listing-v2:shared:${shoe.id}`;
  const [complete, setComplete] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);

  useEffect(() => {
    try {
      setComplete(window.localStorage.getItem(completionKey) === '1');
    } catch {
      // Completion can still be recorded for this mounted session.
    }
  }, [completionKey]);

  function completeFacebookStep() {
    if (complete) return;
    setComplete(true);
    setShowCongratulations(true);
    try {
      window.localStorage.setItem(completionKey, '1');
    } catch {
      // Keep the current completion state when storage is unavailable.
    }
    trackMarketplaceAction('listing_v2_share_complete', { listing_id: shoe.id, surface: 'new_listing_v2' });
  }

  function done() {
    if (!complete) return;
    try {
      window.localStorage.removeItem(completionKey);
    } catch {
      // Navigation should not depend on storage cleanup.
    }
    router.push('/profile');
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="sticky top-14 z-30 mb-3 rounded-xl border border-white/[0.08] bg-slate-950/95 p-3 shadow-xl shadow-black/20 backdrop-blur sm:top-20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-gray-100">Step 5 of 5 · Share</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{complete ? 'Listing flow complete' : 'Your listing is live · one final step'}</p>
          </div>
          <span className={`text-sm font-black ${complete ? 'text-teal-300' : 'text-gray-400'}`}>{complete ? '100%' : '80%'}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800" role="progressbar" aria-label="Listing progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={complete ? 100 : 80}>
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: complete ? '100%' : '80%' }} />
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4 shadow-2xl shadow-black/20 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Your listing is live</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-100">Post it where runners can find it.</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400">Copy the caption, save the image, then open the Facebook group to post.</p>

        <div className="mt-5">
          <ListingShareActions
            shoe={shoe}
            seller={seller}
            isOwner
            defaultOpen
            facebookGroupLabel="Post to FB Groups"
            onFacebookGroupClick={completeFacebookStep}
          />
        </div>

        {complete && (
          <Button type="button" size="lg" onClick={done} className="mt-4 w-full">
            Done — Go to My Profile
          </Button>
        )}
      </section>

      {showCongratulations && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="listing-v2-congrats-title">
          <Confetti />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-teal-300/30 bg-slate-950 p-6 text-center shadow-2xl shadow-teal-500/15">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl shadow-lg shadow-teal-500/30" aria-hidden="true">✓</span>
            <h2 id="listing-v2-congrats-title" className="mt-4 text-2xl font-black text-gray-100">You did it!</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">Hope the right runner finds your pair and sends you an offer soon.</p>
            <Button type="button" size="lg" onClick={done} className="mt-5 w-full">Done — Go to My Profile</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, index) => ({
    left: `${(index * 43) % 100}%`,
    delay: `${(index % 7) * 0.09}s`,
    duration: `${1.8 + (index % 5) * 0.18}s`,
    color: ['#2dd4bf', '#38bdf8', '#fbbf24', '#f472b6'][index % 4],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="listing-v2-confetti absolute -top-6 h-3 w-2 rounded-sm"
          style={{ left: piece.left, backgroundColor: piece.color, animationDelay: piece.delay, animationDuration: piece.duration }}
        />
      ))}
      <style jsx>{`
        .listing-v2-confetti { animation-name: listing-v2-confetti-fall; animation-timing-function: ease-in; animation-fill-mode: forwards; }
        @keyframes listing-v2-confetti-fall {
          0% { transform: translate3d(0, -5vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(20px, 110vh, 0) rotate(680deg); opacity: 0.8; }
        }
        @media (prefers-reduced-motion: reduce) { .listing-v2-confetti { animation: none; top: 12%; opacity: 0.75; } }
      `}</style>
    </div>
  );
}
