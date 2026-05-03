'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type WishlistItem } from '@/types';
import { formatRelativeDate, formatSize, formatPrice, getPublicUrl } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { SuggestMatchModal } from './SuggestMatchModal';
import { ViewSuggestionsModal } from './ViewSuggestionsModal';

interface WishlistCardProps {
  item: WishlistItem;
  isOwner?: boolean;
  currentProfileId?: string;
  onDeleted?: (id: string) => void;
}

function priceRangeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min != null) return `${formatPrice(min)}+`;
  return `Up to ${formatPrice(max!)}`;
}

export function WishlistCard({ item, isOwner = false, currentProfileId, onDeleted }: WishlistCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const firstImg = item.wishlist_images?.[0];
  const imgUrl = firstImg ? getPublicUrl(supabaseUrl, firstImg.storage_path) : null;

  const sizeLabel = formatSize(item.size_eu, item.size_us, item.size_cm);
  const priceLabel = priceRangeLabel(item.price_min_php, item.price_max_php);
  const suggestionCount = item.wishlist_suggestions?.[0]?.count ?? 0;

  async function handleDelete() {
    if (!confirm('Remove this wishlist item?')) return;
    setDeleting(true);
    onDeleted?.(item.id);
    await createClient().from('wishlist_items').delete().eq('id', item.id);
    if (!onDeleted) router.refresh();
  }

  // The "Suggest a match" button is shown to logged-in non-owners
  const canSuggest = !isOwner && currentProfileId && currentProfileId !== item.user_id;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Reference photo */}
      {imgUrl && (
        <div className="relative aspect-video bg-gray-800 border-b border-gray-800">
          <Image src={imgUrl} alt={`${item.brand} ${item.model}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-100 truncate">{item.brand} {item.model}</p>
            {item.color && <p className="text-xs text-gray-500 mt-0.5">{item.color}</p>}
          </div>
          {item.profiles && !isOwner && (
            <Link href={`/profile/${item.profiles.id}`} className="shrink-0">
              {item.profiles.avatar_url ? (
                <Image src={item.profiles.avatar_url} alt={item.profiles.display_name} width={32} height={32} className="rounded-full border border-gray-700" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                  {item.profiles.display_name[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
            </Link>
          )}
        </div>

        {/* Specs */}
        <div className="space-y-1 text-sm">
          {sizeLabel && (
            <p><span className="text-gray-500">Size:</span> <span className="text-gray-300">{sizeLabel}</span></p>
          )}
          {priceLabel && (
            <p><span className="text-gray-500">Budget:</span> <span className="text-teal-400 font-medium">{priceLabel}</span></p>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
        )}

        {/* Owner info (when not viewing on own card) */}
        {item.profiles && !isOwner && (
          <p className="text-xs text-gray-500">
            Posted by{' '}
            <Link href={`/profile/${item.profiles.id}`} className="text-teal-400 hover:text-teal-300">
              {item.profiles.display_name}
            </Link>
            {item.profiles.location && ` · ${item.profiles.location}`}
          </p>
        )}

        <p className="text-xs text-gray-600">{formatRelativeDate(item.created_at)}</p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
          {isOwner && (
            <>
              {suggestionCount > 0 && (
                <button
                  onClick={() => setViewOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors"
                >
                  View {suggestionCount} suggestion{suggestionCount !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center rounded-lg border border-red-800 bg-transparent px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </>
          )}

          {canSuggest && !suggestSubmitted && (
            <button
              onClick={() => setSuggestOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Suggest a match
            </button>
          )}
          {canSuggest && suggestSubmitted && (
            <div className="w-full rounded-lg border border-teal-800 bg-teal-950 px-3 py-2 text-xs text-teal-400 text-center">
              ✓ Suggestion sent — it&apos;s now visible to the wishlist owner.
            </div>
          )}
        </div>
      </div>

      {suggestOpen && currentProfileId && (
        <SuggestMatchModal
          wishlistId={item.id}
          wishlistName={`${item.brand} ${item.model}`}
          suggesterId={currentProfileId}
          onClose={() => setSuggestOpen(false)}
          onSubmitted={() => { setSuggestOpen(false); setSuggestSubmitted(true); }}
        />
      )}

      {viewOpen && (
        <ViewSuggestionsModal
          wishlistId={item.id}
          wishlistName={`${item.brand} ${item.model}`}
          onClose={() => setViewOpen(false)}
        />
      )}
    </div>
  );
}
