'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackMarketplaceAction } from '@/lib/analytics';

type GoferCta = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

type GoferQuestion = {
  id: string;
  question: string;
  answer: string;
  ctas: GoferCta[];
};

const GOFER_QUESTIONS: GoferQuestion[] = [
  {
    id: 'sell_shoes',
    question: 'How do I sell my shoes?',
    answer:
      'Create one clean listing on Go Pair PH. Add the brand, model, size, condition, mileage, price, location, and clear photos of the actual pair. Use top and sole photos at minimum. After publishing, share your Go Pair PH listing link to Facebook groups, Marketplace, Messenger, or running chats.',
    ctas: [
      { label: 'List a Pair', href: '/listings/new', variant: 'primary' },
      { label: 'How to Sell', href: '/help/how-to-sell', variant: 'secondary' },
    ],
  },
  {
    id: 'reserve_pair',
    question: 'How do I reserve a pair?',
    answer:
      'Open the listing and send an offer or request to the seller. If the seller accepts, the pair becomes reserved while you coordinate meetup, payment, delivery, or shipping. A reservation only happens when the seller accepts your request on Go Pair PH.',
    ctas: [
      { label: 'Browse Listings', href: '/browse', variant: 'primary' },
      { label: 'How to Buy', href: '/help/how-to-buy', variant: 'secondary' },
    ],
  },
  {
    id: 'price_shoes',
    question: 'How much should I price this?',
    answer:
      'Use the Shoe Price Estimator as a starting point. Add the original retail price, condition, mileage, age, box or receipt status, and how fast you want to sell. The result is only a guide, so compare with similar listings and adjust based on photos, demand, and urgency.',
    ctas: [
      { label: 'Use Price Estimator', href: '/price-guide', variant: 'primary' },
    ],
  },
  {
    id: 'legit_check',
    question: 'How do I know if a pair is legit?',
    answer:
      'Check the actual photos, not just stock photos. Ask for top, side, heel, outsole, size tag, box, receipt, and close-up photos if needed. Compare the model with official brand photos, watch out for prices that are too good to be true, and avoid sellers who pressure you to pay quickly or refuse extra proof.',
    ctas: [
      { label: 'Read Safety Guide', href: '/safety', variant: 'primary' },
    ],
  },
  {
    id: 'find_size_9',
    question: 'Where can I find size 9 running shoes?',
    answer:
      "Go to GP Marketplace and filter by size. For US size 9, choose the right US type if needed: Men's, Women's, or Unisex. You can also add your shoe size in your profile so Go Pair PH can show similar matches and nearby sellers first.",
    ctas: [
      { label: 'Find Size 9', href: '/browse?size=9&size_unit=us', variant: 'primary' },
      { label: 'Edit Profile', href: '/profile', variant: 'secondary' },
    ],
  },
  {
    id: 'share_facebook',
    question: 'How do I share my listing on Facebook?',
    answer:
      'After publishing a listing, open your listing page and use Post This on Facebook. Copy the caption, download the image, then post your listing link to Facebook groups, Marketplace, Messenger, or your own profile. The Facebook post gives you reach, while the Go Pair PH link keeps the details clean.',
    ctas: [
      { label: 'List a Pair', href: '/listings/new', variant: 'primary' },
      { label: 'How to Sell', href: '/help/how-to-sell', variant: 'secondary' },
    ],
  },
];

function shouldHide(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === '/listings/new') return true;
  if (pathname === '/price-guide') return true;
  if (pathname.startsWith('/auth/')) return true;
  return /^\/listings\/[^/]+\/edit$/.test(pathname);
}

function GoferIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className="h-5 w-5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M7.5 7.8h13a2.2 2.2 0 0 1 2.2 2.2v7.2a2.2 2.2 0 0 1-2.2 2.2h-4.4L12 23.2l.4-3.8H7.5a2.2 2.2 0 0 1-2.2-2.2V10a2.2 2.2 0 0 1 2.2-2.2Z"
        className="stroke-teal-200"
        strokeWidth="1.8"
      />
      <path
        d="M9.6 13.2h.01M14 13.2h.01M18.4 13.2h.01"
        className="stroke-teal-300"
        strokeWidth="2.8"
      />
    </svg>
  );
}

function getAnalyticsContext(pathname: string | null) {
  if (typeof window === 'undefined') {
    return { pathname: pathname ?? '' };
  }

  return {
    pathname: pathname ?? window.location.pathname,
    page_path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || 'direct',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}

export function BuySellFloatingAction() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedQuestion = GOFER_QUESTIONS.find((question) => question.id === selectedQuestionId) ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
    setSelectedQuestionId(null);
  }, [pathname]);

  useEffect(() => {
    function updateVisibility() {
      if (typeof window === 'undefined') return;
      const pageHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const distanceFromBottom = pageHeight - (window.scrollY + window.innerHeight);
      const shouldShow = window.scrollY > 80 && distanceFromBottom > 80;
      setVisible(shouldShow);
      if (!shouldShow) {
        setOpen(false);
        setSelectedQuestionId(null);
      }
    }

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSelectedQuestionId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setSelectedQuestionId(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleToggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) {
        trackMarketplaceAction('ask_gofer_open', {
          surface: 'floating_gofer',
          ...getAnalyticsContext(pathname),
        });
      } else {
        setSelectedQuestionId(null);
      }
      return next;
    });
  }

  function handleQuestionClick(question: GoferQuestion) {
    setSelectedQuestionId(question.id);
    trackMarketplaceAction('ask_gofer_question_click', {
      surface: 'floating_gofer',
      question_id: question.id,
      question: question.question,
      ...getAnalyticsContext(pathname),
    });
  }

  function handleCtaClick(question: GoferQuestion, cta: GoferCta) {
    trackMarketplaceAction('ask_gofer_cta_click', {
      surface: 'floating_gofer',
      question_id: question.id,
      question: question.question,
      cta_label: cta.label,
      cta_href: cta.href,
      ...getAnalyticsContext(pathname),
    });
  }

  if (!mounted || shouldHide(pathname)) return null;

  return createPortal(
    <div
      ref={wrapperRef}
      className={`fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-4 z-[80] w-[min(calc(100vw-2rem),22rem)] transition-all duration-200 sm:right-5 md:bottom-6 md:right-6 ${
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {open && (
        <div
          role="dialog"
          aria-label="Ask Gofer helper"
          className="absolute bottom-full right-0 mb-2 flex max-h-[70vh] w-full flex-col overflow-hidden rounded-2xl border border-teal-300/15 bg-slate-950/95 shadow-2xl shadow-black/60 ring-1 ring-white/[0.03] backdrop-blur-xl"
        >
          <div className="border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center gap-2">
              {selectedQuestion && (
                <button
                  type="button"
                  onClick={() => setSelectedQuestionId(null)}
                  className="mr-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-semibold text-teal-200 transition-colors hover:border-teal-300/25 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
                >
                  All questions
                </button>
              )}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-teal-300/20 bg-teal-300/10">
                <GoferIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-100">Ask Gofer</p>
                <p className="mt-0.5 text-xs leading-4 text-gray-400">
                  Quick help for buying, selling, pricing, and sharing running shoes.
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-2">
            {!selectedQuestion ? (
              <div className="grid gap-1.5">
                {GOFER_QUESTIONS.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => handleQuestionClick(question)}
                    className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-teal-300/25 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50"
                  >
                    <span className="min-w-0 text-sm font-semibold leading-5 text-gray-100">
                      {question.question}
                    </span>
                    <span className="shrink-0 text-teal-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 p-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Gofer says</p>
                  <h2 className="mt-1 text-base font-black leading-6 text-gray-100">{selectedQuestion.question}</h2>
                </div>
                <p className="text-sm leading-6 text-gray-300">{selectedQuestion.answer}</p>
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  {selectedQuestion.ctas.map((cta) => (
                    <Link
                      key={`${selectedQuestion.id}-${cta.href}`}
                      href={cta.href}
                      onClick={() => handleCtaClick(selectedQuestion, cta)}
                      className={
                        cta.variant === 'secondary'
                          ? 'inline-flex min-h-10 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-center text-sm font-bold text-gray-100 transition-colors hover:border-teal-300/30 hover:bg-teal-300/10 focus:outline-none focus:ring-2 focus:ring-teal-300/50'
                          : 'inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-400 px-3 py-2 text-center text-sm font-black text-slate-950 transition-colors hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-slate-950'
                      }
                    >
                      {cta.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggleOpen}
        className="ml-auto flex min-h-12 items-center gap-2 rounded-full border border-teal-200/30 bg-gradient-to-r from-teal-300 to-teal-500 px-4 py-2 text-sm font-black text-slate-950 shadow-2xl shadow-teal-950/40 transition duration-200 hover:from-teal-200 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-950/15" aria-hidden="true">
          <GoferIcon />
        </span>
        Ask Gofer
      </button>
    </div>,
    document.body
  );
}
