'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { VerificationRequest } from '@/types';

interface RequestVerificationButtonProps {
  profileId: string;
  isVerified: boolean;
  existingRequest: VerificationRequest | null;
}

export function RequestVerificationButton({ profileId, isVerified, existingRequest }: RequestVerificationButtonProps) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Already verified — no action needed
  if (isVerified) return null;

  // Pending — show status, no button
  if (existingRequest?.status === 'pending' && !submitted) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-300">
        Verification request pending review
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-xs text-teal-300">
        Request submitted! An admin will review shortly.
      </div>
    );
  }

  async function handleSubmit() {
    if (proof.trim().length < 10) {
      setError('Please provide more detail in your proof.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await createClient().from('verification_requests').insert({
      user_id: profileId,
      proof: proof.trim(),
    });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setOpen(false);
  }

  const buttonLabel = existingRequest?.status === 'rejected' ? 'Request verification again' : 'Request verification';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2"
      >
        {buttonLabel}
      </button>
      {existingRequest?.status === 'rejected' && existingRequest.admin_notes && (
        <p className="text-xs text-gray-500 mt-1">
          Previous request rejected: <span className="italic">&quot;{existingRequest.admin_notes}&quot;</span>
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
              <h2 className="font-semibold text-gray-100">Request Verification</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <p className="text-sm text-gray-400">
                Verified users get a badge that helps buyers and sellers trust them faster. To get verified,
                share a <strong className="text-gray-300">public link or personal identifier</strong> that
                proves your account belongs to a real person — not a dummy account.
              </p>
              <div className="rounded-lg bg-gray-800 px-3 py-2.5 text-xs text-gray-400 space-y-1.5">
                <p className="font-semibold text-gray-300">Examples of good proof:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Link to your Facebook profile (must show a real photo and history)</li>
                  <li>Link to your Instagram, LinkedIn, or other public social profile</li>
                  <li>A vouch from a friend who&apos;s already a verified user</li>
                </ul>
                <p className="text-gray-500 pt-1.5 border-t border-gray-700">
                  <strong className="text-amber-300">Don&apos;t</strong> upload government IDs or sensitive personal
                  documents — a public profile link is enough.
                </p>
              </div>
              <Textarea
                label="Your proof"
                rows={5}
                placeholder="e.g. My Facebook: facebook.com/john.doe.1 — feel free to message me there to confirm."
                value={proof}
                onChange={e => setProof(e.target.value)}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleSubmit} loading={submitting} className="flex-1">Submit Request</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
