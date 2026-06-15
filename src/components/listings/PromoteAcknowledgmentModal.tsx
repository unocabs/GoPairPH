'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface PromoteAcknowledgmentModalProps {
  onClose: () => void;
  onProceed: () => void;
}

export function PromoteAcknowledgmentModal({ onClose, onProceed }: PromoteAcknowledgmentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="font-semibold text-gray-100">Before you promote</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            A quick refresher before we move on — promotions involve real money, so it&apos;s worth a moment.
          </p>

          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-teal-400 shrink-0">•</span>
              <span>Pick a placement: <strong>Featured on Home</strong> or <strong>Top Pick in Browse</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400 shrink-0">•</span>
              <span>Featured is <strong>₱50 / 7 days</strong> or <strong>₱150 / 30 days</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400 shrink-0">•</span>
              <span>Top Pick is <strong>₱30 / 7 days</strong> or <strong>₱100 / 30 days</strong>.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400 shrink-0">•</span>
              <span>Pay via <strong>GCash</strong> or <strong>BPI</strong> in the next step.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-400 shrink-0">•</span>
              <span>Send the receipt screenshot to Go Pair PH on Messenger with your listing link and selected placement.</span>
            </li>
          </ul>

          <div className="rounded-lg bg-amber-950/60 border border-amber-700/60 px-3 py-2.5">
            <p className="text-xs text-amber-200 leading-relaxed">
              Heads-up — what happens if your listing sells before the promotion ends is covered in our policy.{' '}
              <Link
                href="/help/promote-listing"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
              >
                Read the full policy here ↗
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={onProceed} className="flex-1">
            I understand, proceed →
          </Button>
        </div>
      </div>
    </div>
  );
}
