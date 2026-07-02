'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buildMessengerUrl, getFacebookContactUrl } from '@/lib/facebook';
import { labelFeaturedPromotionStatus, labelPaymentMethod } from '@/lib/featuredPromotions';
import { labelSponsoredPaymentMethod, labelSponsoredPromotionStatus } from '@/lib/sponsoredPromotions';
import { formatCondition, formatListingName, formatPrice, formatProfileLocation, formatRelativeDate, formatSize, getListingPath, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import type { ListingViewSummary } from '@/lib/listingViews';
import { BUYBACK_DECLINE_REASONS, BUYBACK_DELIVERY_CHECKS, BUYBACK_PRE_ACCEPTANCE_CHECKS, BUYBACK_STATUS_LABELS } from '@/lib/buyback';
import { trackMarketplaceAction } from '@/lib/analytics';
import type { BuybackInventoryItem, BuybackOffer, FeaturedPromotionOrder, ListingReport, ListingReportReason, VerificationRequest, Profile, Shoe, Shop, ShopStatus, SponsoredPromotionOrder, WishlistOfferReport, WishlistOfferReportReason } from '@/types';

type ShopWithOwner = Shop & { owner?: Pick<Profile, 'id' | 'display_name' | 'location_city' | 'location_province' | 'location_region'> | null };

interface AdminDashboardProps {
  pending: VerificationRequest[];
  verified: Profile[];
  verifiedProofs: VerificationRequest[];
  shops: ShopWithOwner[];
  profiles: Profile[];
  soldListings: Shoe[];
  promotions: FeaturedPromotionOrder[];
  sponsoredPromotions: SponsoredPromotionOrder[];
  listingViews: ListingViewSummary[];
  leadReports: WishlistOfferReport[];
  listingReports: ListingReport[];
  buybackOffers: BuybackOffer[];
  buybackInventory: BuybackInventoryItem[];
  siteSettings: {
    showHomepageActivityPublicly: boolean;
  };
  viewWindow: { startDate: string; endDate: string };
}

type Tab = 'buyback' | 'promotions' | 'pending' | 'verified' | 'shops' | 'soldListings' | 'views' | 'leadReports' | 'listingReports' | 'emailBlast' | 'settings';
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function formatTabLabel(label: string, count: number): string {
  return count > 0 ? `${label} (${count})` : label;
}

function getTodayViewedListingCount(listings: ListingViewSummary[], today: string): number {
  return listings.filter(listing => listing.dailyViews.some(day => day.date === today && day.views > 0)).length;
}

function getPendingPromotionReviewCount(
  promotions: FeaturedPromotionOrder[],
  sponsoredPromotions: SponsoredPromotionOrder[]
): number {
  return promotions.filter(order => order.source === 'paid' && order.review_status === 'pending').length
    + sponsoredPromotions.filter(order => order.review_status === 'pending').length;
}

const LEAD_REPORT_REASON_LABELS: Record<WishlistOfferReportReason, string> = {
  unavailable_or_sold: 'Unavailable or sold',
  price_changed: 'Price changed',
  wrong_item: 'Wrong item',
  broken_link: 'Broken link',
  spam_or_duplicate: 'Spam or duplicate',
  other: 'Other',
};

const LISTING_REPORT_REASON_LABELS: Record<ListingReportReason, string> = {
  misleading_photos: 'Photos misleading or unclear',
  suspicious_or_scam: 'Suspicious or unsafe',
  already_sold: 'Already sold or unavailable',
  wrong_price_or_details: 'Wrong price or details',
  seller_unreachable: 'Seller hard to reach',
  duplicate_or_spam: 'Duplicate or spam',
  other: 'Other',
};

interface EmailBlastPreview {
  blastId: string;
  subject: string;
  previewText: string;
  siteUrl: string;
  recipientCount: number;
  confirmationPhrase: string;
  sample: Array<{ displayName: string | null; email: string }>;
  recipientWarning?: string;
  text: string;
}

async function convertLogoToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Could not prepare this image.'));
        },
        'image/webp',
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image format is not supported by your browser.'));
    };

    img.src = url;
  });
}

export function AdminDashboard({
  pending,
  verified,
  verifiedProofs,
  shops,
  profiles,
  soldListings,
  promotions,
  sponsoredPromotions,
  listingViews,
  leadReports,
  listingReports,
  buybackOffers,
  buybackInventory,
  siteSettings,
  viewWindow,
}: AdminDashboardProps) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(requestedTab === 'promotions' || requestedTab === 'buyback' ? requestedTab : 'views');
  const todayViewedListingCount = getTodayViewedListingCount(listingViews, viewWindow.endDate);
  const pendingPromotionReviewCount = getPendingPromotionReviewCount(promotions, sponsoredPromotions);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-800">
        {([
          { key: 'views', label: formatTabLabel('Listing views', todayViewedListingCount) },
          { key: 'buyback', label: formatTabLabel('Buyback', buybackOffers.filter(offer => offer.status === 'pending').length + buybackInventory.filter(item => ['ready_to_assign', 'preparing'].includes(item.status)).length) },
          { key: 'promotions', label: formatTabLabel('Promotions', pendingPromotionReviewCount) },
          { key: 'pending', label: formatTabLabel('Pending', pending.length) },
          { key: 'verified', label: 'Verified users' },
          { key: 'shops', label: 'Shops' },
          { key: 'soldListings', label: 'Closed listings' },
          { key: 'listingReports', label: formatTabLabel('Listing reports', listingReports.length) },
          { key: 'leadReports', label: formatTabLabel('Lead reports', leadReports.length) },
          { key: 'emailBlast', label: 'Email blast' },
          { key: 'settings', label: 'Settings' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingList requests={pending} />}
      {tab === 'buyback' && <BuybackPanel initialOffers={buybackOffers} initialInventory={buybackInventory} shops={shops.filter(shop => shop.buyback_receiving_enabled)} />}
      {tab === 'promotions' && <FeaturedPromotionsPanel initialPromotions={promotions} initialSponsoredPromotions={sponsoredPromotions} profiles={profiles} />}
      {tab === 'verified' && <VerifiedList users={verified} verificationProofs={verifiedProofs} />}
      {tab === 'shops' && <ShopsPanel shops={shops} profiles={profiles} />}
      {tab === 'soldListings' && <SoldListingsPanel listings={soldListings} />}
      {tab === 'views' && <ListingViewsPanel listings={listingViews} viewWindow={viewWindow} />}
      {tab === 'listingReports' && <ListingReportsPanel reports={listingReports} />}
      {tab === 'leadReports' && <LeadReportsPanel reports={leadReports} />}
      {tab === 'emailBlast' && <EmailBlastPanel />}
      {tab === 'settings' && (
        <AdminSettingsPanel
          initialShowHomepageActivityPublicly={siteSettings.showHomepageActivityPublicly}
        />
      )}
    </div>
  );
}

function BuybackPanel({ initialOffers, initialInventory, shops }: { initialOffers: BuybackOffer[]; initialInventory: BuybackInventoryItem[]; shops: ShopWithOwner[] }) {
  const [offers, setOffers] = useState(initialOffers);
  const [inventory, setInventory] = useState(initialInventory);
  const pending = offers.filter(offer => offer.status === 'pending');
  const inProgress = offers.filter(offer => ['accepted', 'shipped', 'delivered', 'disputed'].includes(offer.status));
  const history = offers.filter(offer => !['pending', 'accepted', 'shipped', 'delivered', 'disputed'].includes(offer.status));

  useEffect(() => setInventory(initialInventory), [initialInventory]);

  function replaceOffer(updated: BuybackOffer) {
    setOffers(previous => previous.map(offer => offer.id === updated.id ? { ...offer, ...updated } : offer));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Pending review', pending.length, 'text-amber-200'],
          ['In progress', inProgress.length, 'text-teal-200'],
          ['Total attempts', offers.length, 'text-gray-100'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <BuybackInventoryPanel inventory={inventory} shops={shops} onChanged={updated => setInventory(current => current.map(item => item.id === updated.id ? { ...item, ...updated } : item))} />
      <section>
        <h2 className="text-lg font-semibold text-gray-100">Pending review</h2>
        <div className="mt-3 space-y-4">
          {pending.length === 0 ? <p className="rounded-xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">No pending buyback requests.</p> : pending.map(offer => <BuybackOfferCard key={offer.id} offer={offer} onChanged={replaceOffer} />)}
        </div>
      </section>
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-100">Shipping and receiving</h2>
          <div className="mt-3 space-y-4">{inProgress.map(offer => <BuybackOfferCard key={offer.id} offer={offer} onChanged={replaceOffer} />)}</div>
        </section>
      )}
      {history.length > 0 && (
        <details className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-200">Review history ({history.length})</summary>
          <div className="mt-4 space-y-4">{history.map(offer => <BuybackOfferCard key={offer.id} offer={offer} onChanged={replaceOffer} />)}</div>
        </details>
      )}
    </div>
  );
}

function snapshotString(snapshot: Record<string, unknown>, key: string): string {
  const value = snapshot[key];
  return value == null ? '' : String(value);
}

function snapshotNumber(snapshot: Record<string, unknown>, key: string): number | '' {
  const value = Number(snapshot[key]);
  return Number.isFinite(value) ? value : '';
}

function BuybackInventoryPanel({ inventory, shops, onChanged }: {
  inventory: BuybackInventoryItem[];
  shops: ShopWithOwner[];
  onChanged: (item: BuybackInventoryItem) => void;
}) {
  const actionable = inventory.filter(item => item.status !== 'sold');
  if (actionable.length === 0) return (
    <section>
      <h2 className="text-lg font-semibold text-gray-100">Ready to relist</h2>
      <p className="mt-3 rounded-xl border border-dashed border-gray-800 p-6 text-center text-sm text-gray-500">Completed buybacks will appear here as private Go Pair PH inventory.</p>
    </section>
  );

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Ready to relist</h2>
          <p className="mt-1 text-xs text-gray-500">Assign completed inventory to an approved internal shop, confirm its details, then publish.</p>
        </div>
        <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-200">{actionable.length} item{actionable.length === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-3 space-y-4">
        {actionable.map(item => <BuybackInventoryCard key={item.id} item={item} shops={shops} onChanged={onChanged} />)}
      </div>
    </section>
  );
}

function BuybackInventoryCard({ item, shops, onChanged }: {
  item: BuybackInventoryItem;
  shops: ShopWithOwner[];
  onChanged: (item: BuybackInventoryItem) => void;
}) {
  const router = useRouter();
  const snapshot = item.relist_snapshot ?? {};
  const [shopId, setShopId] = useState(item.assigned_shop_id ?? '');
  const [brand, setBrand] = useState(snapshotString(snapshot, 'brand'));
  const [model, setModel] = useState(snapshotString(snapshot, 'model'));
  const [color, setColor] = useState(snapshotString(snapshot, 'color'));
  const [price, setPrice] = useState<number | ''>(snapshotNumber(snapshot, 'price_php'));
  const [srp, setSrp] = useState<number | ''>(snapshotNumber(snapshot, 'srp_php'));
  const [sizeEu, setSizeEu] = useState<number | ''>(snapshotNumber(snapshot, 'size_eu'));
  const [sizeUs, setSizeUs] = useState<number | ''>(snapshotNumber(snapshot, 'size_us'));
  const [sizeCm, setSizeCm] = useState<number | ''>(snapshotNumber(snapshot, 'size_cm'));
  const [usSizeType, setUsSizeType] = useState(snapshotString(snapshot, 'us_size_type') || 'unknown');
  const [condition, setCondition] = useState(snapshotString(snapshot, 'condition') || 'good');
  const [mileage, setMileage] = useState<number | ''>(snapshotNumber(snapshot, 'mileage_km'));
  const [description, setDescription] = useState(snapshotString(snapshot, 'description'));
  const [listedInMainFeed, setListedInMainFeed] = useState(snapshot.listed_in_main_feed !== false);
  const [photosConfirmed, setPhotosConfirmed] = useState(snapshot.photos_confirmed === true);
  const [busy, setBusy] = useState<'save' | 'copy' | 'photo' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const listing = item.source_listing;
  const title = listing ? formatListingName(listing.brand, listing.model) : `${brand} ${model}`.trim() || 'Bought-back shoes';
  const locked = item.status === 'listed';

  async function save() {
    setBusy('save'); setError('');
    try {
      const response = await fetch(`/api/admin/buyback-inventory/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId, brand, model, color, price_php: Number(price), srp_php: Number(srp),
          size_eu: Number(sizeEu), size_us: sizeUs === '' ? null : Number(sizeUs), size_cm: sizeCm === '' ? null : Number(sizeCm),
          us_size_type: usSizeType, condition, mileage_km: mileage === '' ? null : Number(mileage),
          purchase_date: snapshotString(snapshot, 'purchase_date'), has_box: snapshot.has_box === true,
          has_receipt: snapshot.has_receipt === true, description, listed_in_main_feed: listedInMainFeed,
          photos_confirmed: photosConfirmed,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not save the relisting draft.');
      onChanged(body.inventory as BuybackInventoryItem);
      trackMarketplaceAction('buyback_inventory_prepare', { inventory_id: item.id, status: 'preparing' });
      router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save.'); }
    finally { setBusy(null); }
  }

  async function copyPhotos() {
    setBusy('copy'); setError('');
    try {
      const response = await fetch(`/api/admin/buyback-inventory/${item.id}/copy-photos`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? body.inventory?.photo_copy_error ?? 'Could not copy the photos.');
      onChanged(body.inventory as BuybackInventoryItem);
      trackMarketplaceAction('buyback_inventory_photo_copy', { inventory_id: item.id, status: 'ready' });
      router.refresh();
    } catch (copyError) { setError(copyError instanceof Error ? copyError.message : 'Could not copy photos.'); }
    finally { setBusy(null); }
  }

  async function publish() {
    if (!confirm(`Publish ${brand} ${model} in the selected shop for ${formatPrice(Number(price))}?`)) return;
    setBusy('publish'); setError('');
    try {
      const response = await fetch(`/api/admin/buyback-inventory/${item.id}/publish`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not publish the listing.');
      onChanged(body.inventory as BuybackInventoryItem);
      trackMarketplaceAction('buyback_inventory_publish', { inventory_id: item.id, status: 'listed' });
      router.refresh();
    } catch (publishError) { setError(publishError instanceof Error ? publishError.message : 'Could not publish.'); }
    finally { setBusy(null); }
  }

  async function uploadPhoto(viewType: 'top' | 'sole', file: File | undefined) {
    if (!file) return;
    setBusy('photo'); setError('');
    const form = new FormData(); form.set('view_type', viewType); form.set('file', file);
    try {
      const response = await fetch(`/api/admin/buyback-inventory/${item.id}/photos`, { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Could not upload the inventory photo.');
      onChanged(body.inventory as BuybackInventoryItem);
      trackMarketplaceAction('buyback_inventory_photo_replace', { inventory_id: item.id, view_type: viewType });
      setPhotosConfirmed(false);
      router.refresh();
    } catch (photoError) { setError(photoError instanceof Error ? photoError.message : 'Could not upload photo.'); }
    finally { setBusy(null); }
  }

  return (
    <article className="rounded-xl border border-teal-500/20 bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-200">{item.status.replaceAll('_', ' ')}</span>
            <span className="text-xs text-gray-500">Single stock · acquired {formatRelativeDate(item.acquired_at)}</span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-gray-100">{title}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-80">
          <div className="rounded-lg bg-gray-950 p-2"><span className="block text-gray-600">Acquisition cost</span><strong className="text-gray-200">{formatPrice(item.acquisition_cost_php)}</strong></div>
          <div className="rounded-lg bg-gray-950 p-2"><span className="block text-gray-600">Minimum resale</span><strong className="text-teal-200">{formatPrice(item.minimum_resale_price_php)}</strong></div>
          <div className="rounded-lg bg-gray-950 p-2"><span className="block text-gray-600">Projected gross</span><strong className="text-gray-200">{formatPrice(Math.max(0, Number(price || 0) - item.acquisition_cost_php))}</strong></div>
        </div>
      </div>

      {locked ? (
        <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/[0.05] p-3 text-sm text-green-100">
          Published to {item.assigned_shop?.name ?? 'internal shop'}.
          {item.resale_listing_id && <Link href={`/listings/${item.resale_listing_id}`} target="_blank" className="ml-2 font-semibold underline">View listing</Link>}
        </div>
      ) : (
        <div className="mt-5 space-y-4 border-t border-gray-800 pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs text-gray-400 sm:col-span-2 lg:col-span-1">Approved internal shop
              <select value={shopId} onChange={event => setShopId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-100"><option value="">Choose shop</option>{shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select>
            </label>
            <AdminInventoryInput label="Brand" value={brand} onChange={setBrand} />
            <AdminInventoryInput label="Model" value={model} onChange={setModel} />
            <AdminInventoryInput label="Colorway" value={color} onChange={setColor} />
            <AdminInventoryInput label="Selling price" type="number" value={price} onChange={value => setPrice(value === '' ? '' : Number(value))} />
            <AdminInventoryInput label="Original retail price" type="number" value={srp} onChange={value => setSrp(value === '' ? '' : Number(value))} />
            <AdminInventoryInput label="EU size" type="number" value={sizeEu} onChange={value => setSizeEu(value === '' ? '' : Number(value))} />
            <AdminInventoryInput label="US size" type="number" value={sizeUs} onChange={value => setSizeUs(value === '' ? '' : Number(value))} />
            <AdminInventoryInput label="CM" type="number" value={sizeCm} onChange={value => setSizeCm(value === '' ? '' : Number(value))} />
            <label className="text-xs text-gray-400">US size type<select value={usSizeType} onChange={event => setUsSizeType(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-100"><option value="mens">Men&apos;s</option><option value="womens">Women&apos;s</option><option value="unisex">Unisex</option><option value="unknown">Unknown</option></select></label>
            <label className="text-xs text-gray-400">Condition<select value={condition} onChange={event => setCondition(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-100"><option value="new">Brand New</option><option value="like_new">Like New</option><option value="good">Good</option><option value="fair">Fair</option></select></label>
            <AdminInventoryInput label="Mileage (km)" type="number" value={mileage} onChange={value => setMileage(value === '' ? '' : Number(value))} />
          </div>
          <label className="block text-xs text-gray-400">Description
            <textarea value={description} onChange={event => setDescription(event.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm leading-6 text-gray-100" />
          </label>
          {(item.photos ?? []).some(photo => photo.copied_storage_path) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transferred listing photos</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(item.photos ?? []).filter(photo => photo.copied_storage_path).map(photo => (
                  <a key={photo.id} href={getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, photo.copied_storage_path!, 'shoe-images', IMAGE_TRANSFORM_PRESETS.listingCard)} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-lg border border-gray-700 bg-gray-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, photo.copied_storage_path!, 'shoe-images', IMAGE_TRANSFORM_PRESETS.listingCard)} alt={`${photo.view_type} inventory view`} className="aspect-square w-full object-cover" />
                    <span className="block px-1 py-1 text-center text-[10px] uppercase text-gray-400">{photo.view_type}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {(['top', 'sole'] as const).map(viewType => (
              <label key={viewType} className="cursor-pointer rounded-lg border border-dashed border-sky-500/30 bg-sky-950/20 px-3 py-2 text-center text-xs font-semibold text-sky-200">
                Replace {viewType} photo
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null} onChange={event => { void uploadPhoto(viewType, event.target.files?.[0]); event.target.value = ''; }} className="sr-only" />
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-teal-500/20 bg-teal-500/[0.05] p-3 text-sm text-gray-200"><input type="checkbox" checked={photosConfirmed} onChange={event => setPhotosConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-500" /><span>I confirmed these photos show the received shoes, including clear top and sole views and any visible flaws.</span></label>
          <label className="flex items-start gap-2 text-sm text-gray-300"><input type="checkbox" checked={listedInMainFeed} onChange={event => setListedInMainFeed(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-500" /> Also show in the main Browse feed</label>

          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" disabled={busy !== null || !shopId} onClick={save} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy === 'save' ? 'Saving…' : 'Save Assignment & Draft'}</button>
            <button type="button" disabled={busy !== null} onClick={copyPhotos} className="rounded-lg border border-sky-500/35 bg-sky-950/40 px-4 py-2.5 text-sm font-semibold text-sky-200 disabled:opacity-40">{busy === 'copy' ? 'Copying…' : item.photo_copy_status === 'ready' ? 'Photos Ready ✓' : 'Retry Photo Copy'}</button>
            <button type="button" disabled={busy !== null || item.status !== 'preparing' || item.photo_copy_status !== 'ready' || !photosConfirmed} onClick={publish} className="rounded-lg border border-amber-400/35 bg-amber-400/[0.08] px-4 py-2.5 text-sm font-semibold text-amber-100 disabled:opacity-40">{busy === 'publish' ? 'Publishing…' : 'Publish Shop Listing'}</button>
          </div>
          {item.photo_copy_error && <p className="text-xs text-amber-200">Photo copy: {item.photo_copy_error}</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      )}
    </article>
  );
}

function AdminInventoryInput({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
}) {
  return <label className="text-xs text-gray-400">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-100" /></label>;
}

function BuybackOfferCard({ offer, onChanged }: { offer: BuybackOffer; onChanged: (offer: BuybackOffer) => void }) {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>(offer.review_checklist ?? {});
  const [deliveryChecks, setDeliveryChecks] = useState<Record<string, boolean>>(offer.delivery_checklist ?? {});
  const [adminNote, setAdminNote] = useState(offer.admin_note ?? '');
  const [declineReason, setDeclineReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [codPaid, setCodPaid] = useState(String(offer.quoted_price_php));
  const [disputeNote, setDisputeNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listing = offer.listing;
  const seller = offer.seller;
  const listingName = listing ? formatListingName(listing.brand, listing.model) : 'Listing unavailable';
  const allReviewChecks = BUYBACK_PRE_ACCEPTANCE_CHECKS.every(([key]) => checks[key] === true);
  const allDeliveryChecks = BUYBACK_DELIVERY_CHECKS.every(([key]) => deliveryChecks[key] === true);

  async function review(action: 'accept' | 'decline') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/buyback-offers/${offer.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action, checklist: checks, admin_note: adminNote || null,
          decline_reason: action === 'decline' ? declineReason : null,
          recipient_name: action === 'accept' ? recipientName : null,
          recipient_phone: action === 'accept' ? recipientPhone : null,
          recipient_address: action === 'accept' ? recipientAddress : null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Review failed.');
      onChanged(body.offer as BuybackOffer); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Review failed.'); }
    finally { setBusy(false); }
  }

  async function fulfill(action: 'delivered' | 'complete' | 'dispute') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/buyback-offers/${offer.id}/fulfillment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          cod_paid_php: action === 'delivered' ? Number(codPaid) : null,
          delivery_checklist: deliveryChecks,
          note: action === 'dispute' ? disputeNote : null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Update failed.');
      onChanged(body.offer as BuybackOffer); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Update failed.'); }
    finally { setBusy(false); }
  }

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-200">{BUYBACK_STATUS_LABELS[offer.status]}</span>
            <span className="text-xs text-gray-500">Attempt #{offer.attempt_number} · {formatRelativeDate(offer.created_at)}</span>
          </div>
          {listing ? <Link href={getListingPath(listing)} target="_blank" className="mt-2 block text-lg font-bold text-gray-100 hover:text-teal-300">{listingName}</Link> : <p className="mt-2 text-lg font-bold text-gray-100">{listingName}</p>}
          <p className="mt-1 text-sm text-gray-400">Seller: {seller?.display_name ?? 'Unavailable'} {seller?.is_verified ? '· Verified' : '· Not verified'}</p>
          <p className="mt-1 text-xs text-gray-500">Proposed send date: {offer.proposed_ship_date} · Pending buyer offers: {offer.pending_buyer_offer_count ?? 0}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[360px]">
          <div className="rounded-lg bg-gray-950 p-2"><p className="text-[10px] uppercase text-gray-500">Retail basis</p><p className="text-sm font-bold text-gray-200">{formatPrice(offer.retail_basis_php)}</p></div>
          <div className="rounded-lg bg-gray-950 p-2"><p className="text-[10px] uppercase text-gray-500">Fast sale</p><p className="text-sm font-bold text-gray-200">{formatPrice(offer.fast_sale_estimate_php)}</p></div>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-2"><p className="text-[10px] uppercase text-amber-300">Buyback</p><p className="text-sm font-bold text-amber-100">{formatPrice(offer.quoted_price_php)}</p></div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
        <p><span className="block text-gray-600">Original price</span>{formatPrice(offer.original_price_php)}</p>
        <p><span className="block text-gray-600">Purchase date</span>{offer.purchase_date}</p>
        <p><span className="block text-gray-600">Original box</span>{offer.has_box ? 'Yes' : 'No'}</p>
        <p><span className="block text-gray-600">Visible flaws</span>{offer.has_visible_flaws ? 'Yes' : 'No'}</p>
      </div>
      {offer.flaw_notes && <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-500/[0.04] px-3 py-2 text-sm text-amber-100"><span className="font-semibold">Flaws:</span> {offer.flaw_notes}</div>}
      {offer.seller_note && <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300"><span className="font-semibold">Seller note:</span> {offer.seller_note}</div>}

      <div className="mt-4 flex flex-wrap gap-2">
        {(offer.proofs ?? []).map(proof => proof.signed_url && (
          <a key={proof.id} href={proof.signed_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-gray-800">Open {proof.kind.replaceAll('_', ' ')}</a>
        ))}
      </div>

      {offer.status === 'pending' && (
        <div className="mt-5 grid gap-5 border-t border-gray-800 pt-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h3 className="text-sm font-semibold text-gray-100">Required acceptance review</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BUYBACK_PRE_ACCEPTANCE_CHECKS.map(([key, label]) => (
                <label key={key} className={`flex items-start gap-2 rounded-lg border p-3 text-xs leading-5 ${checks[key] ? 'border-teal-500/30 bg-teal-500/[0.06] text-teal-100' : 'border-gray-800 bg-gray-950 text-gray-400'}`}>
                  <input type="checkbox" checked={checks[key] === true} onChange={event => setChecks(previous => ({ ...previous, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500" />{label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-100">Decision</h3>
            <input value={recipientName} onChange={event => setRecipientName(event.target.value)} placeholder="Recipient name" className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
            <input value={recipientPhone} onChange={event => setRecipientPhone(event.target.value)} placeholder="Recipient phone" className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
            <textarea value={recipientAddress} onChange={event => setRecipientAddress(event.target.value)} rows={3} placeholder="Complete recipient address" className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
            <textarea value={adminNote} onChange={event => setAdminNote(event.target.value)} rows={3} placeholder="Admin note (optional for acceptance)" className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
            <button disabled={busy || !allReviewChecks || !recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim()} onClick={() => review('accept')} className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-40">Accept and Reserve</button>
            <div className="border-t border-gray-800 pt-3">
              <select value={declineReason} onChange={event => setDeclineReason(event.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"><option value="">Decline reason</option>{BUYBACK_DECLINE_REASONS.map(reason => <option key={reason}>{reason}</option>)}</select>
              <button disabled={busy || !declineReason || !adminNote.trim()} onClick={() => review('decline')} className="mt-2 w-full rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-950/30 disabled:opacity-40">Decline with Note</button>
            </div>
          </div>
        </div>
      )}

      {offer.status === 'accepted' && (
        <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/[0.05] p-3 text-sm text-sky-100">Waiting for the seller to book J&amp;T COD and submit tracking. Offer expires {formatDateTime(offer.expires_at)}.</div>
      )}
      {offer.status === 'shipped' && (
        <div className="mt-5 grid gap-3 border-t border-gray-800 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs text-gray-400">COD amount paid at delivery
            <input type="number" value={codPaid} onChange={event => setCodPaid(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
          </label>
          <button disabled={busy || Number(codPaid) !== Number(offer.quoted_price_php)} onClick={() => fulfill('delivered')} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Mark Delivered &amp; Paid</button>
        </div>
      )}
      {offer.status === 'delivered' && (
        <div className="mt-5 border-t border-gray-800 pt-5">
          <h3 className="text-sm font-semibold text-gray-100">Final receiving checklist</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {BUYBACK_DELIVERY_CHECKS.map(([key, label]) => <label key={key} className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${deliveryChecks[key] ? 'border-teal-500/30 bg-teal-500/[0.06] text-teal-100' : 'border-gray-800 bg-gray-950 text-gray-400'}`}><input type="checkbox" checked={deliveryChecks[key] === true} onChange={event => setDeliveryChecks(previous => ({ ...previous, [key]: event.target.checked }))} className="h-4 w-4 accent-teal-500" />{label}</label>)}
          </div>
          <button disabled={busy || !allDeliveryChecks} onClick={() => fulfill('complete')} className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Complete Buyback</button>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={disputeNote} onChange={event => setDisputeNote(event.target.value)} placeholder="Required dispute reason and evidence note" className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100" />
            <button disabled={busy || !disputeNote.trim()} onClick={() => fulfill('dispute')} className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-40">Open Dispute</button>
          </div>
        </div>
      )}
      {offer.status === 'shipped' && offer.tracking_number && <p className="mt-3 text-xs text-gray-400">J&amp;T tracking: <span className="font-mono text-gray-200">{offer.tracking_number}</span></p>}
      {offer.admin_note && offer.status !== 'pending' && <p className="mt-3 rounded-lg bg-gray-950 px-3 py-2 text-sm text-gray-300"><span className="font-semibold">Admin note:</span> {offer.admin_note}</p>}
      {(offer.events?.length ?? 0) > 0 && (
        <details className="mt-3 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400">Event history ({offer.events?.length})</summary>
          <ol className="mt-2 space-y-2 text-xs text-gray-500">
            {offer.events?.map(event => <li key={event.id}><span className="font-semibold capitalize text-gray-300">{event.event_type.replaceAll('_', ' ')}</span> · {formatDateTime(event.created_at)}{event.note ? ` — ${event.note}` : ''}</li>)}
          </ol>
        </details>
      )}
      {error && <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </article>
  );
}

function FeaturedPromotionsPanel({ initialPromotions, initialSponsoredPromotions, profiles }: { initialPromotions: FeaturedPromotionOrder[]; initialSponsoredPromotions: SponsoredPromotionOrder[]; profiles: Profile[] }) {
  const router = useRouter();
  const [promotions, setPromotions] = useState(initialPromotions);
  const [sponsoredPromotions, setSponsoredPromotions] = useState(initialSponsoredPromotions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const current = promotions.find(order => order.status === 'active') ?? null;
  const pending = promotions.filter(order => order.review_status === 'pending' && order.source === 'paid');
  const sponsoredPending = sponsoredPromotions.filter(order => order.review_status === 'pending');
  const sponsoredActive = sponsoredPromotions
    .filter(order => order.status === 'active')
    .sort((a, b) => {
      const aTime = a.scheduled_end_at ? new Date(a.scheduled_end_at).getTime() : 0;
      const bTime = b.scheduled_end_at ? new Date(b.scheduled_end_at).getTime() : 0;
      return aTime - bTime;
    });
  const queue = promotions
    .filter(order => order.source === 'paid' && (order.status === 'active' || order.status === 'queued'))
    .sort((a, b) => {
      const aTime = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : 0;
      const bTime = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : 0;
      return aTime - bTime;
    });

  async function review(orderId: string, action: 'approve' | 'reject' | 'refund_required') {
    const notes = action === 'approve'
      ? ''
      : window.prompt(action === 'reject' ? 'Reason for rejecting this proof?' : 'Why is this refund required?') ?? '';
    if (action !== 'approve' && !notes.trim()) return;

    setBusyId(orderId);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/promotions/featured/${orderId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? 'Review failed.');
      setPromotions(previous => previous.map(order => order.id === orderId ? { ...order, ...json.order } : order));
      setMessage(action === 'approve' ? 'Promotion approved.' : action === 'reject' ? 'Promotion rejected.' : 'Marked refund required.');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reviewSponsored(orderId: string, action: 'approve' | 'reject' | 'refund_required') {
    const notes = action === 'approve'
      ? ''
      : window.prompt(action === 'reject' ? 'Reason for rejecting this proof?' : 'Why is this refund required?') ?? '';
    if (action !== 'approve' && !notes.trim()) return;

    setBusyId(orderId);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/promotions/sponsored/${orderId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? 'Review failed.');
      setSponsoredPromotions(previous => previous.map(order => order.id === orderId ? { ...order, ...json.order } : order));
      setMessage(action === 'approve' ? 'Top Pick approved.' : action === 'reject' ? 'Top Pick rejected.' : 'Top Pick marked refund required.');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Current Featured</p>
        {current ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-100">{current.listing ? formatListingName(current.listing.brand, current.listing.model) : 'Featured listing'}</p>
              <p className="mt-1 text-sm text-gray-400">{labelFeaturedPromotionStatus(current)}</p>
              <p className="mt-1 text-xs text-gray-500">
                {current.scheduled_end_at ? `Until ${formatDateTime(current.scheduled_end_at)}` : 'No end date'}
              </p>
            </div>
            {current.listing && (
              <Link href={getListingPath(current.listing)} className="rounded-lg border border-gray-700 px-3 py-2 text-center text-sm font-semibold text-gray-200 hover:bg-gray-800">
                Open listing
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No active Featured listing.</p>
        )}
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-950/30 text-red-200' : 'border-teal-500/30 bg-teal-950/30 text-teal-200'}`}>
          {error || message}
        </div>
      )}

      <GpCoinAdminAdjustPanel profiles={profiles} />

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Pending payment reviews</h2>
            <p className="text-sm text-gray-500">Paid placements can already be active or queued while you review the screenshot.</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">{pending.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending Featured proofs.</p>
          ) : pending.map(order => (
            <PromotionReviewCard key={order.id} order={order} busy={busyId === order.id} onReview={review} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Pending Top Pick payment reviews</h2>
            <p className="text-sm text-gray-500">Top Pick placements are applied immediately while you review the screenshot.</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">{sponsoredPending.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {sponsoredPending.length === 0 ? (
            <p className="text-sm text-gray-500">No pending Top Pick proofs.</p>
          ) : sponsoredPending.map(order => (
            <SponsoredPromotionReviewCard key={order.id} order={order} busy={busyId === order.id} onReview={reviewSponsored} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-100">Paid Featured queue</h2>
        <div className="mt-4 space-y-2">
          {queue.length === 0 ? (
            <p className="text-sm text-gray-500">No paid Featured queue yet.</p>
          ) : queue.map(order => (
            <div key={order.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-100">{order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Featured listing'}</p>
                  <p className="text-xs text-gray-500">
                    #{order.queue_position ?? '—'} · {order.duration_days} days · {formatPrice(order.cash_amount_php ?? order.price_php)} cash · {order.coins_used > 0 ? `${order.coins_used} GP` : 'No coins'} · {labelFeaturedPromotionStatus(order)}
                  </p>
                </div>
                <p className="text-xs text-gray-400 sm:text-right">
                  {formatDateTime(order.scheduled_start_at)}<br />→ {formatDateTime(order.scheduled_end_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-100">Active Top Picks</h2>
        <div className="mt-4 space-y-2">
          {sponsoredActive.length === 0 ? (
            <p className="text-sm text-gray-500">No active paid Top Picks yet.</p>
          ) : sponsoredActive.map(order => (
            <div key={order.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-100">{order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Top Pick listing'}</p>
                  <p className="text-xs text-gray-500">
                    {order.duration_days} days · {formatPrice(order.price_php)} · {labelSponsoredPromotionStatus(order.status, order.review_status)}
                  </p>
                </div>
                <p className="text-xs text-gray-400 sm:text-right">
                  {formatDateTime(order.scheduled_start_at)}<br />→ {formatDateTime(order.scheduled_end_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-100">Recent promotion history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2 pr-4">Listing</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {promotions.slice(0, 30).map(order => (
                <tr key={order.id}>
                  <td className="py-2 pr-4">{order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Listing'}</td>
                  <td className="py-2 pr-4">{order.source === 'paid' ? 'Paid Featured' : 'Admin Pick'}</td>
                  <td className="py-2 pr-4 capitalize">{order.status.replaceAll('_', ' ')}</td>
                  <td className="py-2 pr-4">
                    {order.source === 'paid'
                      ? `${order.coin_payment_mode.replaceAll('_', ' ')} · ${order.coins_used} GP · ${formatPrice(order.cash_amount_php ?? order.price_php)} cash`
                      : 'No payment'}
                  </td>
                  <td className="py-2 pr-4">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
              {sponsoredPromotions.slice(0, 30).map(order => (
                <tr key={order.id}>
                  <td className="py-2 pr-4">{order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Listing'}</td>
                  <td className="py-2 pr-4">Paid Top Pick</td>
                  <td className="py-2 pr-4 capitalize">{order.status.replaceAll('_', ' ')}</td>
                  <td className="py-2 pr-4">{labelSponsoredPaymentMethod(order.payment_method)} · {formatPrice(order.price_php)}</td>
                  <td className="py-2 pr-4">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SponsoredPromotionReviewCard({
  order,
  busy,
  onReview,
}: {
  order: SponsoredPromotionOrder;
  busy: boolean;
  onReview: (orderId: string, action: 'approve' | 'reject' | 'refund_required') => void;
}) {
  const listingName = order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Top Pick listing';
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold text-gray-100">{listingName}</p>
          <p className="mt-1 text-xs text-gray-500">
            {order.seller?.display_name ?? 'Seller'} · {order.duration_days} days · {formatPrice(order.price_php)} · {labelSponsoredPaymentMethod(order.payment_method)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Ref: <span className="font-mono text-gray-300">{order.transaction_reference ?? '—'}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatDateTime(order.scheduled_start_at)} → {formatDateTime(order.scheduled_end_at)}
          </p>
          {order.proof_signed_url && (
            <a href={order.proof_signed_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-teal-300 hover:text-teal-200">
              Open payment screenshot →
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
          <button disabled={busy} onClick={() => onReview(order.id, 'approve')} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60">
            Approve
          </button>
          <button disabled={busy} onClick={() => onReview(order.id, 'reject')} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-60">
            Reject
          </button>
          <button disabled={busy} onClick={() => onReview(order.id, 'refund_required')} className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950/40 disabled:opacity-60">
            Refund
          </button>
        </div>
      </div>
    </div>
  );
}

function GpCoinAdminAdjustPanel({ profiles }: { profiles: Profile[] }) {
  const [profileId, setProfileId] = useState('');
  const [amountDelta, setAmountDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/gp-coins/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          amountDelta: Number(amountDelta),
          reason,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? 'Could not adjust GP Coins.');
      setMessage('GP Coin adjustment recorded.');
      setAmountDelta('');
      setReason('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-100">Manual GP Coin adjustment</h2>
        <p className="text-sm text-gray-500">Use positive amounts to grant coins and negative amounts to reverse or claw back suspicious rewards.</p>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 lg:grid-cols-[1fr_140px_1.2fr_auto]">
        <select
          value={profileId}
          onChange={event => setProfileId(event.target.value)}
          required
          className="min-h-10 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-teal-400"
        >
          <option value="">Choose profile</option>
          {profiles.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || profile.user_id}
            </option>
          ))}
        </select>
        <input
          value={amountDelta}
          onChange={event => setAmountDelta(event.target.value)}
          type="number"
          step={1}
          placeholder="+10 or -10"
          required
          className="min-h-10 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-teal-400"
        />
        <input
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder="Reason shown in ledger metadata"
          required
          className="min-h-10 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-teal-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-10 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Adjust'}
        </button>
      </form>
      {(message || error) && (
        <p className={`mt-3 text-sm ${error ? 'text-red-300' : 'text-teal-300'}`}>
          {error || message}
        </p>
      )}
    </section>
  );
}

function PromotionReviewCard({
  order,
  busy,
  onReview,
}: {
  order: FeaturedPromotionOrder;
  busy: boolean;
  onReview: (orderId: string, action: 'approve' | 'reject' | 'refund_required') => void;
}) {
  const listingName = order.listing ? formatListingName(order.listing.brand, order.listing.model) : 'Featured listing';
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold text-gray-100">{listingName}</p>
          <p className="mt-1 text-xs text-gray-500">
            {order.seller?.display_name ?? 'Seller'} · {order.duration_days} days · {order.coins_used} GP · {formatPrice(order.coin_discount_php)} discount · {formatPrice(order.cash_amount_php ?? order.price_php)} cash · {labelPaymentMethod(order.payment_method)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Ref: <span className="font-mono text-gray-300">{order.transaction_reference ?? '—'}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {formatDateTime(order.scheduled_start_at)} → {formatDateTime(order.scheduled_end_at)}
          </p>
          {order.proof_signed_url && (
            <a href={order.proof_signed_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-teal-300 hover:text-teal-200">
              Open payment screenshot →
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
          <button disabled={busy} onClick={() => onReview(order.id, 'approve')} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60">
            Approve
          </button>
          <button disabled={busy} onClick={() => onReview(order.id, 'reject')} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-60">
            Reject
          </button>
          <button disabled={busy} onClick={() => onReview(order.id, 'refund_required')} className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-950/40 disabled:opacity-60">
            Refund
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function safeParseJson(text: string): { error?: string; [key: string]: unknown } {
  try {
    return JSON.parse(text) as { error?: string; [key: string]: unknown };
  } catch {
    return {};
  }
}

function EmailBlastPanel() {
  const [preview, setPreview] = useState<EmailBlastPreview | null>(null);
  const [campaign, setCampaign] = useState<'correction' | 'reactivation' | 'priceEstimator'>('correction');
  const [testEmail, setTestEmail] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function requestBlast(mode: 'preview' | 'test' | 'send') {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/email-blasts/reactivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          campaign,
          testEmail: mode === 'test' ? testEmail : undefined,
          confirm: mode === 'send' ? confirmation : undefined,
        }),
      });
      const text = await response.text();
      const json = text ? safeParseJson(text) : {};
      if (!response.ok) throw new Error(json.error ?? (text || `Request failed (${response.status})`));

      if (mode === 'preview') {
        setPreview(json as unknown as EmailBlastPreview);
        setConfirmation('');
        setMessage('Blast preview loaded.');
      } else if (mode === 'test') {
        setMessage(`Test email sent to ${testEmail}.`);
      } else {
        setMessage(`Blast sent to ${json.sent ?? 0} of ${json.recipientCount ?? 0} users.`);
        setConfirmation('');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handlePreview(event: FormEvent) {
    event.preventDefault();
    requestBlast('preview');
  }

  function handleTest(event: FormEvent) {
    event.preventDefault();
    requestBlast('test');
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    requestBlast('send');
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4">
        <p className="text-sm font-semibold text-amber-100">One-time reactivation blast</p>
        <p className="mt-1 text-sm leading-6 text-amber-100/75">
          Preview first, send yourself a test, then type the exact confirmation phrase before sending to opted-in users.
          Suppressed addresses are excluded, and each recipient gets a private email with one-click unsubscribe.
        </p>
      </div>

      <form onSubmit={handlePreview} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-gray-100">Campaign preview</p>
            <p className="mt-1 text-sm text-gray-500">Loads subject, public URL, recipient count, and a masked recipient sample.</p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Campaign</span>
            <select
              value={campaign}
              onChange={event => {
                setCampaign(event.target.value as 'correction' | 'reactivation' | 'priceEstimator');
                setPreview(null);
                setConfirmation('');
                setMessage('');
                setError('');
              }}
              className="min-h-10 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-teal-500 sm:max-w-md"
            >
              <option value="correction">Corrected link follow-up</option>
              <option value="priceEstimator">Price estimator</option>
              <option value="reactivation">Original reactivation blast</option>
            </select>
          </label>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Preview blast'}
            </button>
          </div>
        </div>
      </form>

      {preview && (
        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Subject</p>
            <p className="mt-1 text-lg font-semibold text-gray-100">{preview.subject}</p>
            <p className="mt-1 text-sm text-gray-500">{preview.previewText}</p>
          <p className="mt-2 text-xs text-gray-500">
            Public URL: <span className="font-mono text-teal-200">{preview.siteUrl}</span>
          </p>
          {preview.recipientWarning && (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              {preview.recipientWarning}
            </p>
          )}
        </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Recipients</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{preview.recipientCount}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Confirm Phrase</p>
              <p className="mt-1 break-words font-mono text-sm text-amber-200">{preview.confirmationPhrase}</p>
            </div>
          </div>

          {preview.sample.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Masked sample</p>
              <div className="flex flex-wrap gap-2">
                {preview.sample.map(item => (
                  <span key={item.email} className="rounded-full border border-gray-800 bg-gray-950 px-2.5 py-1 text-xs text-gray-300">
                    {item.displayName ? `${item.displayName} · ` : ''}{item.email}
                  </span>
                ))}
              </div>
            </div>
          )}

          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm leading-6 text-gray-300">
            {preview.text}
          </pre>
        </div>
      )}

      <form onSubmit={handleTest} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <label className="block text-sm font-semibold text-gray-100" htmlFor="test-email">Send test email</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="test-email"
            type="email"
            value={testEmail}
            onChange={event => setTestEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-10 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={loading || !testEmail}
            className="rounded-lg border border-teal-700 bg-teal-950 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:border-teal-500 hover:bg-teal-900 disabled:opacity-60"
          >
            Send test
          </button>
        </div>
      </form>

      <form onSubmit={handleSend} className="rounded-xl border border-red-500/25 bg-red-950/15 p-4">
        <label className="block text-sm font-semibold text-red-100" htmlFor="blast-confirmation">Send to all users</label>
        <p className="mt-1 text-sm leading-6 text-red-100/70">
          Type the confirmation phrase exactly. This action sends the one-time blast immediately.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="blast-confirmation"
            value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            placeholder={preview?.confirmationPhrase ?? 'Preview first to see the confirmation phrase'}
            className="min-h-10 flex-1 rounded-lg border border-red-900 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={loading || !preview || confirmation !== preview.confirmationPhrase}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            Send blast
          </button>
        </div>
      </form>

      {message && <p className="text-sm text-teal-300">{message}</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

function AdminSettingsPanel({
  initialShowHomepageActivityPublicly,
}: {
  initialShowHomepageActivityPublicly: boolean;
}) {
  const [homepageActivity, setHomepageActivity] = useState(initialShowHomepageActivityPublicly);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleToggle(next: boolean) {
    setHomepageActivity(next);
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/visitor-presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showHomepageActivityPublicly: next }),
      });

      if (!response.ok) throw new Error('Could not update setting.');
      setMessage(next ? 'Homepage activity stats are now public.' : 'Homepage activity stats are now admin-only.');
    } catch {
      setHomepageActivity(!next);
      setMessage('Could not update this setting. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-100">Public activity signals</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Admins always see these stats. Turn them on publicly only when the numbers are strong enough to build trust.
        </p>
      </div>

      <label className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-100">Show homepage activity stats publicly</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Controls the four homepage count cards for new listings, active sellers, looking-for posts, and completed pairs.
          </p>
        </div>
        <span className="inline-flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">{homepageActivity ? 'Public' : 'Admin-only'}</span>
          <input
            type="checkbox"
            checked={homepageActivity}
            onChange={(event) => handleToggle(event.target.checked)}
            disabled={saving}
            className="h-5 w-5 rounded border-gray-700 bg-gray-950 text-teal-500 focus:ring-teal-500"
          />
        </span>
      </label>

      {message && (
        <p className={`text-sm ${message.startsWith('Could not') ? 'text-red-300' : 'text-teal-300'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function formatAdminDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00+08:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

function getManilaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

const CLOSED_LISTING_STATUS_LABELS: Record<Shoe['status'], string> = {
  active: 'Active',
  reserved: 'Reserved',
  sold: 'Sold',
  donated: 'Claimed',
  archived: 'Archived',
};

const CLOSED_SALE_CHANNEL_LABELS: Record<NonNullable<Shoe['closed_sale_channel']>, string> = {
  go_pair: 'Sold in Go Pair',
  outside_go_pair: 'Sold outside Go Pair',
};

function SoldListingsPanel({ listings }: { listings: Shoe[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No closed listings found yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-sm text-gray-300">Closed listings: {listings.length}</p>
        <p className="mt-1 text-xs text-gray-500">
          Showing the latest 10 sold, reserved, or claimed listings. This matches the homepage activity count.
        </p>
      </div>

      <div className="grid gap-3">
        {listings.map(listing => {
          const seller = listing.profiles;
          const size = formatSize(listing.size_eu, listing.size_us, listing.size_cm, listing.us_size_type);

          return (
            <div key={listing.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-teal-800 bg-teal-950 px-2 py-0.5 text-xs font-semibold text-teal-300">
                      {CLOSED_LISTING_STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                    {listing.status === 'sold' || listing.status === 'donated' ? (
                      <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5 text-xs font-semibold text-gray-300">
                        {listing.closed_sale_channel
                          ? CLOSED_SALE_CHANNEL_LABELS[listing.closed_sale_channel]
                          : 'Sale channel not recorded'}
                      </span>
                    ) : null}
                    <span className="text-xs text-gray-500">
                      {formatRelativeDate(listing.updated_at)}
                    </span>
                  </div>

                  <Link
                    href={getListingPath(listing)}
                    target="_blank"
                    className="mt-2 block font-semibold text-gray-100 hover:text-teal-400"
                  >
                    {formatListingName(listing.brand, listing.model)}
                  </Link>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {size ? <span>{size}</span> : null}
                    <span>{formatCondition(listing.condition)}</span>
                    {seller ? (
                      <span>
                        Seller: {seller.display_name}
                        {formatProfileLocation(seller) ? ` · ${formatProfileLocation(seller)}` : ''}
                      </span>
                    ) : (
                      <span>Seller unavailable</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-left lg:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Price</p>
                  <p className="text-lg font-bold text-teal-200">
                    {listing.price_php != null ? formatPrice(listing.price_php) : 'No price'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListingViewsPanel({
  listings,
  viewWindow,
}: {
  listings: ListingViewSummary[];
  viewWindow: { startDate: string; endDate: string };
}) {
  const today = getManilaDateString();

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No listing views recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-100">Private listing view analytics</p>
        <p className="mt-1 text-xs text-gray-500">
          Showing daily views from {formatAdminDate(viewWindow.startDate)} to {formatAdminDate(viewWindow.endDate)}. Sellers and public users cannot see these counts.
        </p>
      </div>

      <div className="grid gap-3">
        {listings.map(listing => (
          <div key={listing.listingId} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Link href={listing.listingPath} target="_blank" className="font-semibold text-gray-100 hover:text-teal-400">
                  {listing.listingName}
                </Link>
                <p className="mt-1 text-xs text-gray-500">
                  {listing.shopName ? `Shop: ${listing.shopName}` : `Seller: ${listing.sellerName}`}
                </p>
              </div>
              <div className="shrink-0 rounded-lg border border-teal-900 bg-teal-950 px-3 py-2 text-left lg:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-400">Total views</p>
                <p className="text-2xl font-bold text-teal-200">{listing.totalViews.toLocaleString('en-PH')}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Daily views</p>
              {listing.dailyViews.length === 0 ? (
                <p className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-500">
                  No views in this date range.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {listing.dailyViews.map(day => {
                    const isToday = day.date === today;
                    return (
                    <span
                      key={`${listing.listingId}-${day.date}`}
                      className={[
                        'rounded-lg border px-3 py-2 text-xs transition-colors',
                        isToday
                          ? 'border-teal-400/60 bg-teal-500/15 text-teal-100 shadow-[0_0_20px_rgba(20,184,166,0.12)]'
                          : 'border-gray-800 bg-gray-950 text-gray-300',
                      ].join(' ')}
                    >
                      <span className={isToday ? 'text-teal-200' : 'text-gray-500'}>{formatAdminDate(day.date)}</span>{' '}
                      <span className={isToday ? 'font-semibold text-teal-50' : 'font-semibold text-gray-100'}>{day.views.toLocaleString('en-PH')}</span>
                    </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingReportsPanel({ reports }: { reports: ListingReport[] }) {
  const [dismissing, setDismissing] = useState<string | null>(null);
  const router = useRouter();

  async function handleDismiss(report: ListingReport) {
    setDismissing(report.id);
    const response = await fetch(`/api/admin/listing-reports/${report.id}`, { method: 'PATCH' });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      alert(body?.error ?? 'Could not dismiss report.');
      setDismissing(null);
      return;
    }
    router.refresh();
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No open listing reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-100">Listing reports</p>
        <p className="mt-1 text-xs text-gray-500">
          Reports are private. Review the listing, flag quality if needed, mark checked if it looks good, or dismiss the report.
        </p>
      </div>

      <div className="grid gap-3">
        {reports.map(report => {
          const listing = report.listing;
          return (
            <div key={report.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-800 bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-300">
                      {LISTING_REPORT_REASON_LABELS[report.reason]}
                    </span>
                    <span className="text-xs text-gray-500">{formatRelativeDate(report.created_at)}</span>
                  </div>

                  {listing ? (
                    <Link
                      href={getListingPath(listing)}
                      target="_blank"
                      className="mt-2 block font-semibold text-gray-100 hover:text-teal-400"
                    >
                      {formatListingName(listing.brand, listing.model)}
                    </Link>
                  ) : (
                    <p className="mt-2 font-semibold text-gray-500">Listing deleted</p>
                  )}

                  {listing && (
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {listing.status}
                      {listing.price_php != null ? ` · ${formatPrice(listing.price_php)}` : ''}
                    </p>
                  )}

                  {report.note && (
                    <p className="mt-3 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 whitespace-pre-wrap">
                      {report.note}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Reporter: {report.reporter?.display_name ?? 'Anonymous'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismiss(report)}
                  disabled={dismissing === report.id}
                  className="shrink-0 rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {dismissing === report.id ? 'Dismissing...' : 'Dismiss report'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadReportsPanel({ reports }: { reports: WishlistOfferReport[] }) {
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleDismiss(report: WishlistOfferReport) {
    setDismissing(report.id);
    const res = await fetch(`/api/admin/wishlist-offer-reports/${report.id}`, { method: 'PATCH' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      alert(body?.error ?? 'Could not dismiss report.');
      setDismissing(null);
      return;
    }
    router.refresh();
  }

  async function handleDeleteLead(report: WishlistOfferReport) {
    if (!report.offer) {
      await handleDismiss(report);
      return;
    }
    if (!confirm('Delete this reported lead? The report will be removed with it.')) return;

    setDeleting(report.id);
    const res = await fetch(`/api/wishlist/${report.wishlist_id}/offers/${report.offer_id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      alert(body?.error ?? 'Could not delete lead.');
      setDeleting(null);
      return;
    }
    router.refresh();
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No open lead reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-sm font-semibold text-gray-100">Looking For lead reports</p>
        <p className="mt-1 text-xs text-gray-500">
          Reports do not change the public lead display. Dismiss valid links or delete bad leads after review.
        </p>
      </div>

      <div className="grid gap-3">
        {reports.map(report => (
          <div key={report.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-800 bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    {LEAD_REPORT_REASON_LABELS[report.reason]}
                  </span>
                  <span className="text-xs text-gray-500">{formatRelativeDate(report.created_at)}</span>
                </div>

                <Link
                  href={`/looking-for?item=${report.wishlist_id}`}
                  target="_blank"
                  className="mt-2 block font-semibold text-gray-100 hover:text-teal-400"
                >
                  {report.item ? `${report.item.brand} ${report.item.model}` : 'Looking For post'}
                </Link>

                {report.offer ? (
                  <div className="mt-2 space-y-1">
                    <a
                      href={report.offer.url}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                      className="block break-all text-sm text-teal-400 underline hover:text-teal-300"
                    >
                      {report.offer.url}
                    </a>
                    <p className="text-xs text-gray-500">
                      Lead posted {formatRelativeDate(report.offer.created_at)}
                      {report.offer.price_php != null ? ` · ${formatPrice(report.offer.price_php)}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Lead already deleted.</p>
                )}

                {report.note && (
                  <p className="mt-3 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 whitespace-pre-wrap">
                    {report.note}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Reporter: {report.reporter?.display_name ?? 'Anonymous'}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => handleDismiss(report)}
                  disabled={dismissing === report.id || deleting === report.id}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  {dismissing === report.id ? 'Dismissing...' : 'Dismiss report'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLead(report)}
                  disabled={dismissing === report.id || deleting === report.id}
                  className="rounded-lg border border-red-900/70 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
                >
                  {deleting === report.id ? 'Deleting...' : 'Delete lead'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ShopFormState {
  slug: string;
  name: string;
  owner_profile_id: string;
  logo_storage_path: string;
  about: string;
  location: string;
  fb_page_url: string;
  status: ShopStatus;
}

const emptyShopForm: ShopFormState = {
  slug: '',
  name: '',
  owner_profile_id: '',
  logo_storage_path: '',
  about: '',
  location: '',
  fb_page_url: '',
  status: 'active',
};

function shopToForm(shop: Shop): ShopFormState {
  return {
    slug: shop.slug,
    name: shop.name,
    owner_profile_id: shop.owner_profile_id,
    logo_storage_path: shop.logo_storage_path ?? '',
    about: shop.about ?? '',
    location: shop.location ?? '',
    fb_page_url: shop.fb_page_url ?? '',
    status: shop.status,
  };
}

function ShopsPanel({ shops, profiles }: { shops: ShopWithOwner[]; profiles: Profile[] }) {
  const [form, setForm] = useState<ShopFormState>(emptyShopForm);
  const [editing, setEditing] = useState<ShopWithOwner | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [receivingSaving, setReceivingSaving] = useState<string | null>(null);
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const ownerOptions = profiles.filter(profile => profile.display_name.trim().length > 0);
  const currentLogoUrl = form.logo_storage_path ? getPublicUrl(supabaseUrl, form.logo_storage_path, 'shop-logos', IMAGE_TRANSFORM_PRESETS.shopLogo) : null;

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function updateField<K extends keyof ShopFormState>(key: K, value: ShopFormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function clearSelectedLogo() {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoError(null);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyShopForm);
    clearSelectedLogo();
  }

  function startEdit(shop: ShopWithOwner) {
    setEditing(shop);
    setForm(shopToForm(shop));
    clearSelectedLogo();
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') || (file.type && !ACCEPTED_LOGO_TYPES.includes(file.type))) {
      setLogoError('Please choose a JPG, PNG, WebP, or HEIC image.');
      return;
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoError(null);
  }

  async function uploadLogo(shopId: string, currentLogoPath: string | null): Promise<string> {
    if (!logoFile) return currentLogoPath ?? '';

    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in before uploading a logo.');

    const webpBlob = await convertLogoToWebP(logoFile);
    const storagePath = `${userId}/${shopId}/logo-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from('shop-logos')
      .upload(storagePath, webpBlob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
    if (uploadError) throw uploadError;

    if (currentLogoPath?.startsWith(`${userId}/`) && currentLogoPath !== storagePath) {
      await supabase.storage.from('shop-logos').remove([currentLogoPath]);
    }

    return storagePath;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editing ? 'edit' : 'add';
    const message = editing
      ? `Save changes to ${editing.name}${logoFile ? ' and upload the selected logo' : ''}?`
      : `Create shop ${form.name.trim()}${logoFile ? ' and upload the selected logo' : ''}?`;

    if (!confirm(message)) return;

    setSaving(true);
    setLogoError(null);
    const supabase = createClient();
    const payload = {
      p_slug: form.slug,
      p_name: form.name,
      p_owner_profile_id: form.owner_profile_id,
      p_logo_storage_path: form.logo_storage_path || null,
      p_about: form.about || null,
      p_location: form.location || null,
      p_fb_page_url: form.fb_page_url || null,
      p_status: form.status,
    };

    let result;

    try {
      if (editing) {
        const logoPath = await uploadLogo(editing.id, editing.logo_storage_path);
        result = await supabase.rpc('admin_update_shop', {
          p_shop_id: editing.id,
          ...payload,
          p_logo_storage_path: logoPath || null,
        });
      } else {
        result = await supabase.rpc('admin_create_shop', { ...payload, p_logo_storage_path: null });
        if (result.error) throw result.error;

        const createdShopId = result.data as string | null;
        if (!createdShopId) throw new Error('Shop was created, but no shop id was returned.');

        if (logoFile) {
          const logoPath = await uploadLogo(createdShopId, null);
          result = await supabase.rpc('admin_update_shop', {
            p_shop_id: createdShopId,
            ...payload,
            p_logo_storage_path: logoPath || null,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not ${action} shop.`;
      setLogoError(
        message.toLowerCase().includes('bucket not found')
          ? 'Logo storage is not set up yet. Apply the shop-logo Supabase migration first.'
          : message
      );
      setSaving(false);
      return;
    }

    if (result?.error) {
      alert(`Could not ${action} shop: ${result.error.message}`);
      setSaving(false);
      return;
    }

    resetForm();
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(shop: ShopWithOwner) {
    if (!confirm(`Delete ${shop.name}? Existing listings will be detached from this shop.`)) return;

    setDeleting(shop.id);
    const { error } = await createClient().rpc('admin_delete_shop', { p_shop_id: shop.id });
    if (error) {
      alert('Could not delete shop: ' + error.message);
      setDeleting(null);
      return;
    }

    setDeleting(null);
    if (editing?.id === shop.id) resetForm();
    router.refresh();
  }

  async function toggleBuybackReceiving(shop: ShopWithOwner) {
    const enabled = !shop.buyback_receiving_enabled;
    if (enabled && shop.status !== 'active') {
      alert('Activate this shop before approving it for buyback inventory.');
      return;
    }
    setReceivingSaving(shop.id);
    const response = await fetch(`/api/admin/shops/${shop.id}/buyback-receiving`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }),
    });
    const body = await response.json().catch(() => ({}));
    setReceivingSaving(null);
    if (!response.ok) {
      alert(body.error ?? 'Could not update buyback receiving access.');
      return;
    }
    trackMarketplaceAction('buyback_receiving_shop_toggle', { shop_id: shop.id, enabled });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-100">{editing ? 'Edit shop' : 'Add shop'}</h2>
          <p className="mt-1 text-xs text-gray-500">Assign an owner profile so the shop can post listings.</p>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shop name</span>
            <input
              required
              value={form.name}
              onChange={event => updateField('name', event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Go Pair Shop"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">URL slug</span>
            <input
              required
              pattern="[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?"
              value={form.slug}
              onChange={event => updateField('slug', event.target.value.toLowerCase())}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="go-pair-shop"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</span>
            <select
              required
              value={form.owner_profile_id}
              onChange={event => updateField('owner_profile_id', event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Choose a profile</option>
              {ownerOptions.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
              <select
                value={form.status}
                onChange={event => updateField('status', event.target.value as ShopStatus)}
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</span>
              <input
                value={form.location}
                onChange={event => updateField('location', event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Pampanga"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Facebook page URL</span>
            <input
              type="url"
              value={form.fb_page_url}
              onChange={event => updateField('fb_page_url', event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="https://facebook.com/yourshop"
            />
          </label>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shop logo</span>
            <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                {logoPreviewUrl || currentLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl ?? currentLogoUrl ?? ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-gray-600">{form.name[0]?.toUpperCase() ?? 'S'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  id="admin-shop-logo"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleLogoChange}
                  disabled={saving}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-teal-500 disabled:opacity-50"
                />
                <p className="mt-1 truncate text-xs text-gray-500">
                  {logoFile ? logoFile.name : currentLogoUrl ? 'Current logo shown' : 'JPG, PNG, WebP, or HEIC'}
                </p>
                {logoFile && (
                  <button
                    type="button"
                    onClick={clearSelectedLogo}
                    disabled={saving}
                    className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-200 disabled:opacity-50"
                  >
                    Remove selected image
                  </button>
                )}
              </div>
            </div>
            {logoError && <p className="mt-1 text-xs leading-snug text-red-300">{logoError}</p>}
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">About</span>
            <textarea
              value={form.about}
              onChange={event => updateField('about', event.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Short shop description"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add shop'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="min-w-0">
        {shops.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
            <p className="text-gray-500">No shops yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">Shops: {shops.length}</p>
            {shops.map(shop => (
              <div key={shop.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {shop.status === 'active' ? (
                        <Link href={`/shop/${shop.slug}`} target="_blank" className="font-semibold text-gray-100 hover:text-teal-400">
                          {shop.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-gray-100">{shop.name}</span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        shop.status === 'active'
                          ? 'border-green-800 bg-green-950 text-green-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400'
                      }`}>
                        {shop.status}
                      </span>
                      {shop.buyback_receiving_enabled && <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-200">Buyback receiving</span>}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">/shop/{shop.slug}</p>
                    <p className="mt-2 text-sm text-gray-300">
                      Owner: {shop.owner?.display_name ?? 'Unknown profile'}
                    </p>
                    {shop.location && <p className="text-xs text-gray-500">{shop.location}</p>}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => toggleBuybackReceiving(shop)}
                      disabled={receivingSaving === shop.id}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${shop.buyback_receiving_enabled ? 'border-teal-700 text-teal-200 hover:bg-teal-950' : 'border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                    >
                      {receivingSaving === shop.id ? 'Saving…' : shop.buyback_receiving_enabled ? 'Disable Receiving' : 'Approve Receiving'}
                    </button>
                    <button
                      onClick={() => startEdit(shop)}
                      className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(shop)}
                      disabled={deleting === shop.id}
                      className="rounded-lg border border-red-900/70 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
                    >
                      {deleting === shop.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingList({ requests }: { requests: VerificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No pending requests. ✓</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {requests.map(req => <PendingCard key={req.id} request={req} />)}
    </div>
  );
}

function PendingCard({ request }: { request: VerificationRequest }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const router = useRouter();

  async function handle(action: 'approve' | 'reject') {
    if (action === 'reject' && notes.trim().length === 0) {
      if (!confirm('Reject without a reason? It\'s nicer to give the user feedback.')) return;
    }
    setLoading(true);
    const fn = action === 'approve' ? 'approve_verification' : 'reject_verification';
    const { error } = await createClient().rpc(fn, {
      p_request_id: request.id,
      p_notes: notes.trim() || null,
    });
    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
      return;
    }
    setDone(action === 'approve' ? 'approved' : 'rejected');
    setLoading(false);
    setTimeout(() => router.refresh(), 800);
  }

  if (done) {
    const cls = done === 'approved'
      ? 'border-green-800 bg-green-950 text-green-300'
      : 'border-gray-700 bg-gray-800 text-gray-400';
    return (
      <div className={`rounded-xl border ${cls} p-4 text-sm text-center`}>
        Request {done}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href={`/profile/${request.user_id}`}
          target="_blank"
          className="font-semibold text-gray-200 hover:text-teal-400"
        >
          {request.profiles?.display_name ?? 'Unknown user'}
        </Link>
        <span className="text-xs text-gray-500">{formatRelativeDate(request.created_at)}</span>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Submitted proof</p>
        <p className="text-sm text-gray-300 whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-800/40 p-3 break-words">
          {request.proof}
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Reason for rejection, or a note that goes into the audit log."
          className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handle('reject')}
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => handle('approve')}
          disabled={loading}
          className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
        >
          Approve &amp; Verify
        </button>
      </div>
    </div>
  );
}

function VerifiedList({ users, verificationProofs }: { users: Profile[]; verificationProofs: VerificationRequest[] }) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const router = useRouter();
  const proofByProfileId = new Map<string, VerificationRequest>();

  for (const proof of verificationProofs) {
    if (!proofByProfileId.has(proof.user_id)) {
      proofByProfileId.set(proof.user_id, proof);
    }
  }

  async function handleRevoke(profileId: string, name: string) {
    if (!confirm(`Revoke verification for ${name}? They'll lose the badge.`)) return;
    setRevoking(profileId);
    const { error } = await createClient().rpc('revoke_verification', { p_user_id: profileId });
    if (error) { alert('Error: ' + error.message); setRevoking(null); return; }
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No verified users yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-300">Verified Users: {users.length}</p>
      {users.map(u => {
        const proof = proofByProfileId.get(u.id);
        const facebookUrl = getFacebookContactUrl(u.fb_username);
        const messengerUrl = buildMessengerUrl(u.fb_username);
        const location = formatProfileLocation(u);

        return (
          <div key={u.id} className="rounded-xl border border-gray-800 bg-gray-900/90 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${u.id}`} target="_blank" className="text-sm font-semibold text-gray-100 hover:text-teal-400 inline-flex items-center gap-1.5">
                    {u.display_name}
                    <VerifiedBadge size="sm" />
                  </Link>
                  {proof?.reviewed_at && (
                    <span className="rounded-full border border-gray-700 bg-gray-950 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                      Verified {formatRelativeDate(proof.reviewed_at)}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                    <p className="font-semibold uppercase tracking-[0.12em] text-gray-600">Location</p>
                    <p className="mt-1 text-gray-300">{location || 'No location added'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                    <p className="font-semibold uppercase tracking-[0.12em] text-gray-600">Facebook / Messenger</p>
                    {u.fb_username ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="break-all text-gray-300">facebook.com/{u.fb_username}</span>
                        {facebookUrl && (
                          <Link href={facebookUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-300 hover:text-teal-200">
                            View FB
                          </Link>
                        )}
                        {messengerUrl && (
                          <Link href={messengerUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-300 hover:text-sky-200">
                            Messenger
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-amber-300">No Facebook username saved</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3 sm:col-span-2 xl:col-span-1">
                    <p className="font-semibold uppercase tracking-[0.12em] text-gray-600">Profile</p>
                    <p className="mt-1 break-all text-gray-500">ID: {u.id}</p>
                    <p className="mt-1 text-gray-500">Joined {formatRelativeDate(u.created_at)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-teal-500/15 bg-teal-950/10 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-300">Submitted verification proof</p>
                  {proof ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-300">{proof.proof}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No approved proof record found for this profile.</p>
                  )}
                  {proof?.admin_notes && (
                    <p className="mt-2 border-t border-gray-800 pt-2 text-xs text-gray-500">
                      Admin note: {proof.admin_notes}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRevoke(u.id, u.display_name)}
                disabled={revoking === u.id}
                className="self-start rounded-lg border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
              >
                {revoking === u.id ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
