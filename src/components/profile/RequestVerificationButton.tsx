'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import type { VerificationRequest } from '@/types';

interface RequestVerificationButtonProps {
  profileId: string;
  isVerified: boolean;
  existingRequest: VerificationRequest | null;
  fbUsername: string | null;
}

type ProofType = 'Facebook' | 'Instagram' | 'Strava' | 'TikTok';

interface ProofEntry {
  type: ProofType;
  value: string;
}

const PROOF_TYPES: ProofType[] = ['Facebook', 'Instagram', 'Strava', 'TikTok'];

const PLACEHOLDERS: Record<ProofType, string> = {
  Facebook: 'facebook.com/yourname',
  Instagram: '@yourhandle  or  instagram.com/yourhandle',
  Strava: 'strava.com/athletes/12345678',
  TikTok: '@yourhandle  or  tiktok.com/@yourhandle',
};

const MAX_PROOFS = 5;

export function RequestVerificationButton({
  profileId,
  isVerified,
  existingRequest,
  fbUsername,
}: RequestVerificationButtonProps) {
  const hasFbUsername = !!fbUsername;

  const [open, setOpen] = useState(false);
  const [proofs, setProofs] = useState<ProofEntry[]>(() => [
    // Auto-populate first row with the user's stored FB username so the
    // admin sees it inline with any other proofs they add.
    { type: 'Facebook', value: fbUsername ? `facebook.com/${fbUsername}` : '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (isVerified) return null;

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

  function updateProof(index: number, patch: Partial<ProofEntry>) {
    setProofs(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addProof() {
    if (proofs.length >= MAX_PROOFS) return;
    setProofs(rows => [...rows, { type: 'Instagram', value: '' }]);
  }

  function removeProof(index: number) {
    setProofs(rows => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const filled = proofs
      .map(p => ({ type: p.type, value: p.value.trim() }))
      .filter(p => p.value.length > 0);

    if (filled.length < 1) {
      setError('Please add at least one proof.');
      return;
    }

    // Concatenated string with line breaks — admin sees one proof per line.
    const proofText = filled.map(p => `${p.type}: ${p.value}`).join('\n');

    setSubmitting(true);
    setError(null);
    const { error: err } = await createClient().from('verification_requests').insert({
      user_id: profileId,
      proof: proofText,
    });
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setOpen(false);
  }

  const buttonLabel = existingRequest?.status === 'rejected'
    ? 'Request verification again'
    : 'Request verification';

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
                Verified users get a badge that helps buyers and sellers trust them faster. Share at least one
                public profile that proves your account belongs to a real person — adding more improves your
                chance of approval.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Proof of Identity <span className="text-teal-500">*</span>
                </label>
                <div className="space-y-2">
                  {proofs.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={p.type}
                        onChange={e => updateProof(i, { type: e.target.value as ProofType })}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      >
                        {PROOF_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={p.value}
                        onChange={e => updateProof(i, { value: e.target.value })}
                        placeholder={PLACEHOLDERS[p.type]}
                        className="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                      {proofs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProof(i)}
                          aria-label="Remove this proof"
                          className="shrink-0 rounded-lg p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {proofs.length < MAX_PROOFS && (
                  <button
                    type="button"
                    onClick={addProof}
                    className="mt-2 text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    + Add another
                  </button>
                )}
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                <strong className="text-amber-300">Don&apos;t</strong> upload government IDs or sensitive
                personal documents — a public profile link is enough.
              </p>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-800 shrink-0 space-y-3">
              {!hasFbUsername && (
                <p className="rounded-lg border border-amber-700/60 bg-amber-950/60 px-3 py-2 text-xs font-medium text-amber-300 text-center">
                  Add your Facebook username in <span className="font-semibold">Edit Profile</span> before requesting verification.
                </p>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="neutral" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!hasFbUsername}
                  className="flex-1"
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
