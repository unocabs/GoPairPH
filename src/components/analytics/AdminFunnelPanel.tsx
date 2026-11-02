'use client';
import { useCallback, useEffect, useState } from 'react';

interface Funnel {
  days: number; start_at: string; end_at: string;
  view_events: number; unattributed_view_events: number; viewed_listings: number;
  inquiry_listings: number; replied_listings: number; sold_listings: number; buyer_listing_inquiries: number; other_inquiry_listings: number;
  promotion_cash_minor: number; estimator_cash_minor: number; cash_refunded_minor: number;
  coins_applied: number; cash_paying_accounts: number; test_paid_payments: number; excluded_profiles: string[];
}
const money = (minor: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(minor / 100);
export function AdminFunnelPanel({ profiles }: { profiles: Array<{ id: string; display_name: string; is_admin: boolean }> }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Funnel | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/admin/marketplace-funnel?days=${days}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message ?? 'Could not load the funnel.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, revision]);
  const exclude = useCallback(async (profileId: string, excluded: boolean) => {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/marketplace-funnel', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId, excluded }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSelection(''); setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the exclusion.'); }
    finally { setSaving(false); }
  }, []);
  const stages = data ? [
    { label: 'Viewed', value: data.viewed_listings }, { label: 'Received an inquiry', value: data.inquiry_listings },
    { label: 'Seller responded', value: data.replied_listings }, { label: 'Sale confirmed', value: data.sold_listings },
  ] : [];
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-gray-100">Marketplace funnel</h2><label className="text-sm text-gray-300">Window <select value={days} onChange={event => setDays(Number(event.target.value))} className="ml-2 min-h-11 rounded-lg border border-gray-700 bg-gray-950 px-3">{[7, 30, 90].map(value => <option key={value} value={value}>Last {value} days</option>)}</select></label></div>
    <p className="text-sm leading-6 text-gray-400">Tracks for-sale listings viewed during this window, then inquiries and seller responses after a recorded view. Counts are per listing, not per visitor. Sales are seller-confirmed completed requests in this cohort, not independently verified payments for shoes.</p>
    {error && <p role="alert" className="text-red-300">{error} <button onClick={() => setRevision(value => value + 1)} className="underline">Retry</button></p>}
    {loading ? <p role="status" className="text-gray-400">Loading funnel…</p> : data && !error && <>
      <p className="text-xs text-gray-500">From {new Date(data.start_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} · Philippines time · outcomes as of now</p>
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stages.map((stage, index) => <li key={stage.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4"><p className="text-xs text-gray-400">{stage.label}</p><p className="mt-1 text-2xl font-bold text-gray-100">{stage.value.toLocaleString()}</p><p className="mt-2 text-xs text-teal-300">{index === 0 ? 'Listings in this cohort' : stages[index - 1].value > 0 ? `${Math.round(stage.value / stages[index - 1].value * 100)}% of previous stage` : 'No previous-stage activity yet'}</p></li>)}</ol>
      <p className="text-xs leading-5 text-gray-400">{data.view_events.toLocaleString()} recorded views (deduplicated per listing, visitor and day) · {data.buyer_listing_inquiries} buyer/listing inquiry combinations. A seller message, offer response or completed request counts as a response. The cohort can continue progressing after the window ends. Another {data.other_inquiry_listings} listings received inquiries without a preceding recorded view in this window and are outside this funnel.</p>
      <div className="rounded-xl border border-gray-800 p-4"><h3 className="font-semibold text-gray-100">Tracked website revenue</h3><p className="mt-1 text-xs leading-5 text-gray-400">Live, verified payments received in this window, less recorded refunds on those payments. Before processing fees, taxes and operating costs; excludes shoe-sale amounts and legacy manual promotion receipts.</p><dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{[
        ['Promotion cash', money(data.promotion_cash_minor)], ['Estimator cash', money(data.estimator_cash_minor)],
        ['Total cash after refunds', money(data.promotion_cash_minor + data.estimator_cash_minor)],
        ['Refunds on these payments', money(data.cash_refunded_minor)], ['Cash-paying accounts', data.cash_paying_accounts],
        ['Coins applied to live paid orders', data.coins_applied],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-gray-400">{label}</dt><dd className="mt-1 break-words text-lg font-bold text-gray-100">{value}</dd></div>)}</dl><p className="mt-3 text-xs text-gray-500">Coins are promotional credits, not cash revenue. Coin counts are before any coin returns. {data.test_paid_payments} paid test-mode transactions excluded from revenue.</p></div>
      <div className="rounded-xl border border-gray-800 p-4"><h3 className="font-semibold text-gray-100">Exclude test accounts</h3><p className="mt-1 text-xs leading-5 text-gray-400">Admin accounts are excluded automatically. Add other test accounts to exclude their inventory, inquiries, identified views and payments. Signed-out tests and historical anonymous views cannot be identified retroactively ({data.unattributed_view_events} unattributed views in this window).</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="test-profile">Test account</label><select id="test-profile" value={selection} onChange={event => setSelection(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100"><option value="">Choose a test account</option>{profiles.filter(profile => !profile.is_admin && !data.excluded_profiles.includes(profile.id)).map(profile => <option key={profile.id} value={profile.id}>{profile.display_name} · {profile.id.slice(0, 8)}</option>)}</select><button disabled={!selection || saving} onClick={() => exclude(selection, true)} className="min-h-11 rounded-lg border border-teal-700 px-4 text-sm text-teal-200 disabled:opacity-50">Exclude account</button></div>
        <ul className="mt-3 space-y-2">{data.excluded_profiles.map(id => <li key={id} className="flex items-center justify-between gap-3 text-sm text-gray-300"><span>{profiles.find(profile => profile.id === id)?.display_name ?? id}</span><button disabled={saving} onClick={() => exclude(id, false)} className="min-h-11 text-teal-300 disabled:opacity-50">Include again</button></li>)}</ul>
      </div>
    </>}
  </section>;
}
