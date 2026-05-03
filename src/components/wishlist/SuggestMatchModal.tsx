'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPublicUrl, formatSize, formatPrice } from '@/lib/utils';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { Shoe } from '@/types';

interface SuggestMatchModalProps {
  wishlistId: string;
  wishlistName: string;
  suggesterId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SuggestMatchModal({ wishlistId, wishlistName, suggesterId, onClose, onSubmitted }: SuggestMatchModalProps) {
  const [listings, setListings] = useState<Shoe[]>([]);
  const [alreadySuggested, setAlreadySuggested] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    async function load() {
      const [listingsRes, suggestedRes] = await Promise.all([
        supabase
          .from('shoes')
          .select('*, shoe_images(*)')
          .eq('seller_id', suggesterId)
          .in('status', ['active', 'reserved'])
          .order('created_at', { ascending: false }),
        supabase
          .from('wishlist_suggestions')
          .select('shoe_id')
          .eq('wishlist_id', wishlistId)
          .eq('suggester_id', suggesterId),
      ]);
      setListings((listingsRes.data as Shoe[]) ?? []);
      setAlreadySuggested(new Set(((suggestedRes.data as { shoe_id: string }[]) ?? []).map(s => s.shoe_id)));
      setLoading(false);
    }
    load();
  }, [suggesterId, wishlistId, supabase]);

  function toggle(id: string) {
    if (alreadySuggested.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) { setError('Pick at least one listing to suggest.'); return; }
    setSubmitting(true);
    setError(null);
    const rows = Array.from(selected).map(shoe_id => ({
      wishlist_id: wishlistId,
      shoe_id,
      suggester_id: suggesterId,
      message: message.trim() || null,
    }));
    const { error: err } = await supabase.from('wishlist_suggestions').insert(rows);
    if (err) { setError(err.message); setSubmitting(false); return; }
    onSubmitted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="font-semibold text-gray-100">Suggest a match</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-gray-400">
            Pick one or more of your listings to suggest for{' '}
            <span className="font-medium text-gray-200">{wishlistName}</span>. They&apos;ll appear on the
            wishlist owner&apos;s view, and they can browse them like any listing.
          </p>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading your listings…</div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-5 text-center space-y-2">
              <p className="text-sm text-gray-400">You don&apos;t have any active listings to suggest.</p>
              <Link href="/listings/new" className="text-sm text-teal-400 hover:text-teal-300">
                Create a listing →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map(shoe => {
                const topImg = shoe.shoe_images?.find(i => i.view_type === 'top') ?? shoe.shoe_images?.[0];
                const imgUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;
                const isSelected = selected.has(shoe.id);
                const isAlready = alreadySuggested.has(shoe.id);
                return (
                  <button
                    key={shoe.id}
                    type="button"
                    onClick={() => toggle(shoe.id)}
                    disabled={isAlready}
                    className={`rounded-xl border-2 overflow-hidden text-left transition-all ${
                      isAlready
                        ? 'border-gray-800 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-teal-500 ring-1 ring-teal-500/50'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-800">
                      {imgUrl ? (
                        <Image src={imgUrl} alt={shoe.model} fill className="object-cover" sizes="160px" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-700">
                          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                          </svg>
                        </div>
                      )}
                      {isAlready && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-300 bg-gray-800 px-2 py-1 rounded">Already suggested</span>
                        </div>
                      )}
                      {isSelected && !isAlready && (
                        <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                          <div className="rounded-full bg-teal-500 p-1.5">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold text-gray-200 truncate">{shoe.brand} {shoe.model}</p>
                      <p className="text-xs text-gray-500">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>
                      {shoe.price_php && <p className="text-xs font-bold text-teal-400 mt-0.5">{formatPrice(shoe.price_php)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <Textarea
            label="Message (optional)"
            rows={3}
            placeholder="Hey, I think these might be what you're looking for…"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={submitting}
            disabled={selected.size === 0 || listings.length === 0}
            className="flex-1"
          >
            Suggest {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
