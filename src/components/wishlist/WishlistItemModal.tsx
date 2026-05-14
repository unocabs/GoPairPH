'use client';

import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/SessionProvider';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatRelativeDate, formatSize, getPublicUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { AddOfferForm } from './AddOfferForm';
import type { WishlistItem, WishlistOffer, WishlistImage, WishlistOfferReportReason } from '@/types';

interface WishlistItemModalProps {
  initialItem: WishlistItem;
  onClose: () => void;
}

interface HydrateResponse {
  item: WishlistItem & { wishlist_images?: WishlistImage[] };
  offers: WishlistOffer[];
}

function priceRangeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min != null) return `${formatPrice(min)}+`;
  return `Up to ${formatPrice(max!)}`;
}

const REPORT_REASON_OPTIONS: { value: WishlistOfferReportReason; label: string }[] = [
  { value: 'unavailable_or_sold', label: 'Unavailable or sold' },
  { value: 'price_changed', label: 'Price changed' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'broken_link', label: 'Broken link' },
  { value: 'spam_or_duplicate', label: 'Spam or duplicate' },
  { value: 'other', label: 'Other' },
];

export function WishlistItemModal({ initialItem, onClose }: WishlistItemModalProps) {
  const router = useRouter();
  const { profile } = useSession();
  const [item, setItem] = useState<WishlistItem>(initialItem);
  const [offers, setOffers] = useState<WishlistOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingOfferIds, setDeletingOfferIds] = useState<Set<string>>(new Set());
  const [reportingOffer, setReportingOffer] = useState<WishlistOffer | null>(null);
  const [reportReason, setReportReason] = useState<WishlistOfferReportReason>('unavailable_or_sold');
  const [reportNote, setReportNote] = useState('');
  const [reportTurnstileToken, setReportTurnstileToken] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportedOfferIds, setReportedOfferIds] = useState<Set<string>>(new Set());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const images = item.wishlist_images ?? [];
  const sizeLabel = formatSize(item.size_eu, item.size_us, item.size_cm);
  const budgetLabel = priceRangeLabel(item.price_min_php, item.price_max_php);
  const isOwner = !!profile && profile.id === item.user_id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingOffers(true);
      try {
        const res = await fetch(`/api/wishlist/${initialItem.id}`);
        if (!res.ok) throw new Error('Failed to load');
        const body = (await res.json()) as HydrateResponse;
        if (cancelled) return;
        setItem(body.item);
        setOffers(body.offers);
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [initialItem.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleCopy() {
    const url = `${window.location.origin}/find-my-pair?item=${item.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!isOwner) return;
    if (!confirm('Remove this pair request? All leads on it will also be removed.')) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('wishlist_items').delete().eq('id', item.id);
    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }
    onClose();
    router.refresh();
  }

  function handleOfferAdded(offer: WishlistOffer) {
    setOffers(prev => [offer, ...prev]);
  }

  function openReportForm(offer: WishlistOffer) {
    setReportingOffer(offer);
    setReportReason('unavailable_or_sold');
    setReportNote('');
    setReportTurnstileToken(null);
    setReportError(null);
  }

  function closeReportForm() {
    if (submittingReport) return;
    setReportingOffer(null);
    setReportTurnstileToken(null);
    setReportError(null);
  }

  async function handleReportSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reportingOffer || !reportTurnstileToken) return;

    setSubmittingReport(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/wishlist/${item.id}/offers/${reportingOffer.id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reportReason,
          note: reportNote,
          turnstileToken: reportTurnstileToken,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to report lead');
      }
      setReportedOfferIds(prev => new Set(prev).add(reportingOffer.id));
      setReportingOffer(null);
      setReportNote('');
      setReportTurnstileToken(null);
    } catch (err) {
      setReportError((err as { message?: string })?.message ?? 'Failed to report lead');
      setReportTurnstileToken(null);
    } finally {
      setSubmittingReport(false);
    }
  }

  async function handleOfferDelete(offer: WishlistOffer) {
    if (!profile?.is_admin && profile?.id !== offer.offerer_id) return;
    if (!confirm('Delete this lead?')) return;

    setDeletingOfferIds(prev => new Set(prev).add(offer.id));
    try {
      const res = await fetch(`/api/wishlist/${item.id}/offers/${offer.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to delete lead');
      }
      setOffers(prev => prev.filter(existing => existing.id !== offer.id));
    } catch (err) {
      alert((err as { message?: string })?.message ?? 'Failed to delete lead');
    } finally {
      setDeletingOfferIds(prev => {
        const next = new Set(prev);
        next.delete(offer.id);
        return next;
      });
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0 gap-3">
          <h2 className="font-semibold text-gray-100 truncate">{item.brand} {item.model}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors" aria-label="Close">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map(img => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-gray-800 bg-gray-800">
                  <Image src={getPublicUrl(supabaseUrl, img.storage_path)} alt={`${item.brand} ${item.model} reference`} fill className="object-cover" sizes="200px" />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-1.5 text-sm">
            {item.color && (
              <p><span className="text-gray-500">Color:</span> <span className="text-gray-200">{item.color}</span></p>
            )}
            {sizeLabel && (
              <p><span className="text-gray-500">Size:</span> <span className="text-gray-200">{sizeLabel}</span></p>
            )}
            {budgetLabel && (
              <p><span className="text-gray-500">Budget:</span> <span className="text-teal-400 font-medium">{budgetLabel}</span></p>
            )}
            {item.location && (
              <p><span className="text-gray-500">Location:</span> <span className="text-gray-200">{item.location}</span></p>
            )}
            {item.description && (
              <p className="text-gray-400 pt-1">{item.description}</p>
            )}
            <p className="text-xs text-gray-600 pt-1">Posted {formatRelativeDate(item.created_at)}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-200">
                {loadingOffers ? 'Leads' : `${offers.length} lead${offers.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {loadingOffers ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-500">Loading leads...</div>
            ) : offers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-800 p-4 text-sm text-gray-500 text-center">
                No leads yet. Be the first.
              </div>
            ) : (
              <ul className="space-y-2">
                {offers.map(offer => {
                  const canDeleteOffer = !!profile && (profile.is_admin || profile.id === offer.offerer_id);
                  const deletingOffer = deletingOfferIds.has(offer.id);

                  return (
                  <li key={offer.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 underline break-all"
                      >
                        {offer.url}
                      </a>
                      {offer.price_php != null && (
                        <span className="shrink-0 text-teal-300 font-medium">{formatPrice(offer.price_php)}</span>
                      )}
                    </div>
                    {offer.note && <p className="mt-1 text-gray-300">{offer.note}</p>}
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        {offer.profiles?.display_name ? `from ${offer.profiles.display_name} · ` : ''}
                        {formatRelativeDate(offer.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openReportForm(offer)}
                          disabled={reportedOfferIds.has(offer.id)}
                          className="rounded-md border border-gray-700 px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reportedOfferIds.has(offer.id) ? 'Reported' : 'Report lead'}
                        </button>
                        {canDeleteOffer && (
                          <button
                            type="button"
                            onClick={() => handleOfferDelete(offer)}
                            disabled={deletingOffer}
                            className="rounded-md border border-red-900/70 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingOffer ? 'Deleting...' : 'Delete lead'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          <AddOfferForm wishlistId={item.id} onAdded={handleOfferAdded} />

          {isOwner && (
            <div className="pt-2 border-t border-gray-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
                className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300"
              >
                Remove this pair request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    {reportingOffer && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
        onClick={e => { if (e.target === e.currentTarget) closeReportForm(); }}
      >
        <form onSubmit={handleReportSubmit} className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-100">Report lead</h3>
            <p className="mt-1 text-xs text-gray-500">
              This report goes to the Go Pair PH admin queue. The lead stays visible until an admin reviews it.
            </p>
          </div>

          <div className="space-y-4">
            <Select
              label="Reason"
              value={reportReason}
              onChange={e => setReportReason(e.target.value as WishlistOfferReportReason)}
              options={REPORT_REASON_OPTIONS}
              required
            />
            <Textarea
              label="Note (optional)"
              rows={3}
              maxLength={500}
              value={reportNote}
              onChange={e => setReportNote(e.target.value)}
              placeholder="Add details that can help review this lead."
            />
            <TurnstileWidget
              onToken={setReportTurnstileToken}
              onExpire={() => setReportTurnstileToken(null)}
            />
            {reportError && <p className="text-sm text-red-400">{reportError}</p>}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeReportForm} disabled={submittingReport}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingReport} disabled={!reportTurnstileToken || submittingReport}>
              Submit report
            </Button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}
