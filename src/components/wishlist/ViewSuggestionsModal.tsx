'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPublicUrl, formatPrice, formatSize, formatRelativeDate, getListingPath } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { WishlistSuggestion } from '@/types';

interface ViewSuggestionsModalProps {
  wishlistId: string;
  wishlistName: string;
  onClose: () => void;
}

export function ViewSuggestionsModal({ wishlistId, wishlistName, onClose }: ViewSuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<WishlistSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    supabase
      .from('wishlist_suggestions')
      .select('*, profiles(*), shoes(*, shoe_images(*))')
      .eq('wishlist_id', wishlistId)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: unknown }) => {
        setSuggestions((data as WishlistSuggestion[]) ?? []);
        setLoading(false);
      });
  }, [wishlistId, supabase]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-100">Suggested matches</h2>
            <p className="text-xs text-gray-500 truncate">For {wishlistName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-gray-500 py-8">Loading…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No suggestions yet.</p>
          ) : suggestions.map(s => {
            const shoe = s.shoes;
            const topImg = shoe?.shoe_images?.find(i => i.view_type === 'top') ?? shoe?.shoe_images?.[0];
            const imgUrl = topImg ? getPublicUrl(supabaseUrl, topImg.storage_path) : null;

            return (
              <div key={s.id} className="rounded-xl border border-gray-800 bg-gray-800/40 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                    {imgUrl ? (
                      <Image src={imgUrl} alt={shoe?.model ?? ''} fill className="object-cover" sizes="64px" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {shoe ? (
                      <Link href={getListingPath(shoe)} className="text-sm font-semibold text-gray-200 hover:text-teal-400 transition-colors">
                        {shoe.brand} {shoe.model}
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-500">Listing no longer available</p>
                    )}
                    {shoe && (
                      <p className="text-xs text-gray-500">{formatSize(shoe.size_eu, shoe.size_us, shoe.size_cm)}</p>
                    )}
                    {shoe?.price_php && (
                      <p className="text-xs font-bold text-teal-400">{formatPrice(shoe.price_php)}</p>
                    )}
                  </div>
                </div>
                {s.message && (
                  <p className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-3">&quot;{s.message}&quot;</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    From{' '}
                    <Link href={`/profile/${s.suggester_id}`} className="text-teal-400 hover:text-teal-300">
                      {s.profiles?.display_name ?? 'Unknown'}
                    </Link>
                  </span>
                  <span>{formatRelativeDate(s.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-gray-800 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}
