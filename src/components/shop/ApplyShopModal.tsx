'use client';

import { useEffect, useState } from 'react';

interface ApplyShopModalProps {
  onClose: () => void;
}

const ADMIN_EMAIL = 'rgiancabrera@gmail.com';

const PITCH = [
  { title: 'Free storefront, no tech setup', body: 'Logo, listings page, and a vanity URL — ready in a day.' },
  { title: 'Automatic exposure on /browse', body: "Every listing you post shows up in the marketplace's main feed and on your own page. Toggle off per-listing if you want it shop-only." },
  { title: 'Multi-stock built in', body: "One listing covers all the pairs you have on hand — no relisting after each sale." },
  { title: 'Trusted Pampanga running audience', body: 'Your listings reach buyers already looking for running shoes on Go Pair PH.' },
  { title: 'Verified shop badge', body: 'A trust signal for buyers — included once your application is approved.' },
];

export function ApplyShopModal({ onClose }: ApplyShopModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ADMIN_EMAIL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-6 sm:pt-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-100">Open your shop on Go Pair PH</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              For Pampanga and nearby running shoe resellers who serve Pampanga buyers. Free during early onboarding.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          <ul className="space-y-3">
            {PITCH.map(p => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-100">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">How to apply</p>
            <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
              <li>Email your application to{' '}
                <button
                  onClick={handleCopyEmail}
                  className="font-mono text-teal-400 hover:text-teal-300 underline-offset-2 hover:underline"
                  title="Copy email"
                >
                  {ADMIN_EMAIL}
                </button>
                {copied && <span className="ml-2 text-xs text-green-400">Copied</span>}
              </li>
              <li>Include shop name, FB page or business proof, Pampanga location or service area, preferred URL slug, and your logo file.</li>
              <li>We&apos;ll get back to you within a few days. Once approved, your shop is live at <span className="font-mono text-gray-400">/shop/your-slug</span>.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
