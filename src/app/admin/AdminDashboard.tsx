'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatRelativeDate, getPublicUrl } from '@/lib/utils';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import type { ListingViewSummary } from '@/lib/listingViews';
import type { VerificationRequest, Profile, Shop, ShopStatus, WishlistOfferReport, WishlistOfferReportReason } from '@/types';

type ShopWithOwner = Shop & { owner?: Pick<Profile, 'id' | 'display_name' | 'location'> | null };

interface AdminDashboardProps {
  pending: VerificationRequest[];
  recent: VerificationRequest[];
  verified: Profile[];
  shops: ShopWithOwner[];
  profiles: Profile[];
  listingViews: ListingViewSummary[];
  leadReports: WishlistOfferReport[];
  siteSettings: { showActiveVisitorsPublicly: boolean };
  viewWindow: { startDate: string; endDate: string };
}

type Tab = 'pending' | 'recent' | 'verified' | 'shops' | 'views' | 'leadReports' | 'emailBlast' | 'settings';
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const LEAD_REPORT_REASON_LABELS: Record<WishlistOfferReportReason, string> = {
  unavailable_or_sold: 'Unavailable or sold',
  price_changed: 'Price changed',
  wrong_item: 'Wrong item',
  broken_link: 'Broken link',
  spam_or_duplicate: 'Spam or duplicate',
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
  recent,
  verified,
  shops,
  profiles,
  listingViews,
  leadReports,
  siteSettings,
  viewWindow,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('views');

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-800">
        {([
          { key: 'views', label: `Listing views (${listingViews.length})` },
          { key: 'pending', label: `Pending (${pending.length})` },
          { key: 'recent', label: `Recent reviews` },
          { key: 'verified', label: `Verified users (${verified.length})` },
          { key: 'shops', label: `Shops (${shops.length})` },
          { key: 'leadReports', label: `Lead reports (${leadReports.length})` },
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
      {tab === 'recent' && <RecentList requests={recent} />}
      {tab === 'verified' && <VerifiedList users={verified} />}
      {tab === 'shops' && <ShopsPanel shops={shops} profiles={profiles} />}
      {tab === 'views' && <ListingViewsPanel listings={listingViews} viewWindow={viewWindow} />}
      {tab === 'leadReports' && <LeadReportsPanel reports={leadReports} />}
      {tab === 'emailBlast' && <EmailBlastPanel />}
      {tab === 'settings' && <AdminSettingsPanel initialShowActiveVisitorsPublicly={siteSettings.showActiveVisitorsPublicly} />}
    </div>
  );
}

function EmailBlastPanel() {
  const [preview, setPreview] = useState<EmailBlastPreview | null>(null);
  const [campaign, setCampaign] = useState<'correction' | 'reactivation'>('correction');
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
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? 'Request failed');

      if (mode === 'preview') {
        setPreview(json as EmailBlastPreview);
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
          Preview first, send yourself a test, then type the exact confirmation phrase before sending to all users.
          Each recipient gets a private email, not a shared recipient list.
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
                setCampaign(event.target.value as 'correction' | 'reactivation');
                setPreview(null);
                setConfirmation('');
                setMessage('');
                setError('');
              }}
              className="min-h-10 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-teal-500 sm:max-w-md"
            >
              <option value="correction">Corrected link follow-up</option>
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
  initialShowActiveVisitorsPublicly,
}: {
  initialShowActiveVisitorsPublicly: boolean;
}) {
  const [showPublicly, setShowPublicly] = useState(initialShowActiveVisitorsPublicly);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleToggle(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    setShowPublicly(next);
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/visitor-presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showActiveVisitorsPublicly: next }),
      });

      if (!response.ok) throw new Error('Could not update setting.');
      setMessage(next ? 'Active visitor count is now public.' : 'Active visitor count is now admin-only.');
    } catch {
      setShowPublicly(!next);
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
          Admins always see the active visitor count in the navbar. Turn this on only when you want everyone to see it.
        </p>
      </div>

      <label className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-100">Show active visitors publicly</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Visitors are counted approximately when their browser has been active in the last 5 minutes.
          </p>
        </div>
        <span className="inline-flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">{showPublicly ? 'Public' : 'Admin-only'}</span>
          <input
            type="checkbox"
            checked={showPublicly}
            onChange={handleToggle}
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
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const ownerOptions = profiles.filter(profile => profile.display_name.trim().length > 0);
  const currentLogoUrl = form.logo_storage_path ? getPublicUrl(supabaseUrl, form.logo_storage_path, 'shop-logos') : null;

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
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">/shop/{shop.slug}</p>
                    <p className="mt-2 text-sm text-gray-300">
                      Owner: {shop.owner?.display_name ?? 'Unknown profile'}
                    </p>
                    {shop.location && <p className="text-xs text-gray-500">{shop.location}</p>}
                  </div>

                  <div className="flex shrink-0 gap-2">
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

function RecentList({ requests }: { requests: VerificationRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-800 py-16 text-center">
        <p className="text-gray-500">No reviews yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {requests.map(req => (
        <div key={req.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/profile/${req.user_id}`} target="_blank" className="text-sm font-medium text-gray-200 hover:text-teal-400">
              {req.profiles?.display_name ?? 'Unknown'}
            </Link>
            {req.admin_notes && (
              <p className="text-xs text-gray-500 italic truncate">&quot;{req.admin_notes}&quot;</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              req.status === 'approved'
                ? 'bg-green-950 text-green-400 border border-green-800'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}>
              {req.status}
            </span>
            <span className="text-xs text-gray-600">{req.reviewed_at ? formatRelativeDate(req.reviewed_at) : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerifiedList({ users }: { users: Profile[] }) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const router = useRouter();

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
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/profile/${u.id}`} target="_blank" className="text-sm font-medium text-gray-200 hover:text-teal-400 inline-flex items-center gap-1.5">
              {u.display_name}
              <VerifiedBadge size="sm" />
            </Link>
            {u.location && <p className="text-xs text-gray-500">{u.location}</p>}
          </div>
          <button
            onClick={() => handleRevoke(u.id, u.display_name)}
            disabled={revoking === u.id}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {revoking === u.id ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      ))}
    </div>
  );
}
