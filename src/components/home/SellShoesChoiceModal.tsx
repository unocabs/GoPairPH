'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { trackMarketplaceAction } from '@/lib/analytics';

export function SellShoesChoiceModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    trackMarketplaceAction('sell_shoes_choice_open', {
      surface: 'homepage_hero',
    });
  }

  function handleChoice(choice: 'list_now' | 'price_first') {
    trackMarketplaceAction('sell_shoes_choice_click', {
      surface: 'homepage_hero',
      choice,
    });
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        onClick={handleOpen}
        className="px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base"
      >
        Sell Your Shoes
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sell-shoes-choice-title"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-teal-400/20 bg-slate-950 shadow-2xl shadow-black/60">
            <div className="relative p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_88%_22%,rgba(59,130,246,0.10),transparent_32%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Sell your shoes</p>
                    <h2 id="sell-shoes-choice-title" className="mt-2 text-2xl font-extrabold tracking-tight text-gray-100">
                      How do you want to start?
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-slate-950/70 text-gray-400 transition-colors hover:border-teal-300/30 hover:text-gray-100"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/listings/new"
                    onClick={() => handleChoice('list_now')}
                    className="group rounded-xl border border-white/[0.08] bg-slate-950/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/45 hover:bg-teal-400/10"
                  >
                    <span className="block text-lg font-black text-gray-100">List Now</span>
                    <span className="mt-2 block text-sm leading-6 text-gray-400 group-hover:text-gray-300">
                      I already know my price
                    </span>
                  </Link>

                  <Link
                    href="/price-guide"
                    onClick={() => handleChoice('price_first')}
                    className="group rounded-xl border border-teal-400/30 bg-teal-400/[0.08] p-4 shadow-[0_0_28px_rgba(45,212,191,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/60 hover:bg-teal-400/14"
                  >
                    <span className="block text-lg font-black text-teal-100">Price First</span>
                    <span className="mt-2 block text-sm leading-6 text-gray-400 group-hover:text-gray-300">
                      Help me find a resale range
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
