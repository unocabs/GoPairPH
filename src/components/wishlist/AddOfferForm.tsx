'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/components/auth/SessionProvider';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { getListingPath, formatListingName } from '@/lib/utils';
import type { WishlistOffer } from '@/types';

interface MyListing {
  id: string;
  slug: string | null;
  brand: string;
  model: string;
  price_php: number | null;
}

interface AddOfferFormProps {
  wishlistId: string;
  onAdded: (offer: WishlistOffer) => void;
}

export function AddOfferForm({ wishlistId, onAdded }: AddOfferFormProps) {
  const { profile } = useSession();
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [shoeId, setShoeId] = useState<string>('');
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) { setMyListings([]); return; }
    const supabase = createClient();
    supabase
      .from('shoes')
      .select('id, slug, brand, model, price_php')
      .eq('seller_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then((res: { data: unknown }) => setMyListings(((res.data as MyListing[]) ?? [])));
  }, [profile]);

  const listingOptions = useMemo(() => [
    { value: '', label: 'Manual link…' },
    ...myListings.map(l => ({ value: l.id, label: formatListingName(l.brand, l.model) })),
  ], [myListings]);

  function handlePickListing(id: string) {
    setShoeId(id);
    if (!id) return;
    const listing = myListings.find(l => l.id === id);
    if (!listing) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setUrl(`${origin}${getListingPath({ id: listing.id, slug: listing.slug })}`);
    if (listing.price_php != null) setPrice(String(listing.price_php));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Please complete the captcha to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/wishlist/${wishlistId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnstileToken,
          data: {
            url: url.trim(),
            price_php: price.trim() ? Number(price) : null,
            note: note.trim() || null,
            shoe_id: shoeId || null,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Failed to add offer');
      onAdded(body as WishlistOffer);
      setUrl(''); setPrice(''); setNote(''); setShoeId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add offer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-sm font-semibold text-gray-200">Add an offer</p>
      <p className="text-xs text-gray-500">
        Paste a link to where this shoe is for sale — Go Pair, Facebook Marketplace, Carousell, anywhere.
        Anyone can add an offer. Spam will be removed.
      </p>

      {profile && myListings.length > 0 && (
        <Select
          label="Pick from my listings"
          options={listingOptions}
          value={shoeId}
          onChange={e => handlePickListing(e.target.value)}
          hint="Picking one auto-fills the URL and price."
        />
      )}

      <Input
        label="URL"
        required
        type="url"
        placeholder="https://…"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Price (PHP)"
          type="number"
          min={0}
          placeholder="optional"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
        <Input
          label="Note"
          maxLength={140}
          placeholder="e.g. BNIB, ships from QC"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" loading={submitting} disabled={!turnstileToken || submitting || !url.trim()} className="w-full">
        Add offer
      </Button>
    </form>
  );
}
