'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

const INTRO_SEEN_KEY = 'gopairph:new-listing-v2:intro-seen';

const STEPS = [
  { number: '1', title: 'List', body: 'Add the shoe details buyers need.', src: '/guides/listing-photo-example-top.png' },
  { number: '2', title: 'Photos', body: 'Show the pair from above and below.', src: '/guides/listing-photo-example-sole.png' },
  { number: '3', title: 'Share', body: 'Post the same listing link on Facebook.', src: '/home-carousel/post-once-share-link.jpg' },
] as const;

export function ListingV2Intro() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setOpen(window.localStorage.getItem(INTRO_SEEN_KEY) !== '1');
    } catch {
      setOpen(true);
    }
  }, []);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // The modal can still close when storage is unavailable.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-teal-300 transition-colors hover:text-teal-200"
      >
        How it works
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-v2-intro-title"
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-teal-400/20 bg-slate-950 p-5 shadow-2xl shadow-black/60 sm:p-6"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close how listing works"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Create one clean listing</p>
            <h2 id="listing-v2-intro-title" className="mt-2 pr-9 text-2xl font-black tracking-tight text-gray-100">
              Add it once. Share it anywhere.
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Add the important details and clear photos, then use one Go Pair PH link wherever you post.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {STEPS.map(step => (
                <div key={step.number} className="overflow-hidden rounded-xl border border-white/[0.1] bg-slate-900/70 text-center shadow-lg shadow-black/20">
                  <div className="relative h-20 overflow-hidden bg-slate-900 sm:h-24">
                    <Image src={step.src} alt="" fill className="object-cover opacity-85" sizes="(max-width: 640px) 30vw, 180px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-teal-200/40 bg-slate-950/85 text-[11px] font-black text-teal-200">{step.number}</span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-gray-100">{step.title}</p>
                    <p className="mt-1 hidden text-[11px] leading-4 text-gray-500 min-[360px]:block">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-gray-300">
              {['About 2–3 minutes', 'Clean share link', 'FB-ready share image', 'No repeated details'].map(label => (
                <span key={label} className="rounded-full border border-white/[0.08] bg-slate-900 px-2.5 py-1">{label}</span>
              ))}
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-500 px-4 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              Okay
            </button>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
