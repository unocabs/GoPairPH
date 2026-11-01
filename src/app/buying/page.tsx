import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/layout/PageShell';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';
import { purchaseStatusLabel } from '@/lib/messaging/config';
import type { Shoe } from '@/types';
import type { ListingSnapshot } from '@/lib/messaging/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My Buying', robots: { index: false, follow: false } };
const tabs = ['saved', 'inquiries', 'offers', 'reserved', 'completed', 'history'] as const;
const labels = ['Saved', 'Inquiries', 'Offers', 'Reserved', 'Completed', 'History'];

export default async function BuyingPage({ searchParams }: { searchParams: { tab?: string; before?: string; id?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=%2Fbuying');
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/profile');
  const tab = tabs.includes(searchParams.tab as typeof tabs[number]) ? searchParams.tab as typeof tabs[number] : 'offers';
  const validCursor = z.iso.datetime({ offset: true }).safeParse(searchParams.before).success && z.string().uuid().safeParse(searchParams.id).success;
  const cursor = validCursor ? `created_at.lt.${searchParams.before},and(created_at.eq.${searchParams.before},id.lt.${searchParams.id})` : null;
  let rows: Array<{ id: string; created_at: string; name: string; status: string; price: number | null; href: string; listing?: Shoe }> = [];
  let error = false;
  if (tab === 'saved') {
    let q = supabase.from('saved_listings').select('id,created_at,listing:shoes!saved_listings_listing_id_fkey(id,slug,brand,model,price_php,status)').eq('user_id', profile.id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (cursor) q = q.or(cursor);
    const result = await q; error = Boolean(result.error);
    rows = (result.data ?? []).flatMap(row => { const shoe = (Array.isArray(row.listing) ? row.listing[0] : row.listing) as unknown as Shoe | null; return shoe ? [{ id: row.id, created_at: row.created_at, name: formatListingName(shoe.brand, shoe.model), status: shoe.status === 'active' ? 'Saved for later' : shoe.status, price: shoe.price_php, href: getListingPath(shoe), listing: shoe }] : []; });
  } else if (tab === 'inquiries') {
    let q = supabase.from('chat_conversations').select('id,created_at,listing_snapshot,purchase_requests!purchase_requests_conversation_id_fkey(id)').eq('buyer_id', profile.id).is('purchase_requests', null).gt('last_sequence', 0).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (cursor) q = q.or(cursor);
    const result = await q; error = Boolean(result.error);
    rows = (result.data ?? []).map(row => { const snap = row.listing_snapshot as ListingSnapshot; return { id: row.id, created_at: row.created_at, name: snap.name, status: 'Conversation started', price: snap.price_php, href: `/messages?conversation=${row.id}` }; });
  } else {
    const status = tab === 'offers' ? 'pending' : tab === 'reserved' ? 'accepted' : tab === 'completed' ? 'completed' : 'declined';
    let q = supabase.from('purchase_requests').select('id,created_at,status,status_reason,offer_price_php,conversation_id,listing:shoes!listing_id(id,slug,brand,model,price_php)').eq('buyer_id', profile.id).eq('status', status).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (cursor) q = q.or(cursor);
    const result = await q; error = Boolean(result.error);
    rows = (result.data ?? []).map(row => { const shoe = (Array.isArray(row.listing) ? row.listing[0] : row.listing) as unknown as Shoe | null; return { id: row.id, created_at: row.created_at, name: shoe ? formatListingName(shoe.brand, shoe.model) : 'Shoes', status: purchaseStatusLabel(row.status, row.status_reason), price: row.offer_price_php ?? shoe?.price_php ?? null, href: row.conversation_id ? `/messages?conversation=${row.conversation_id}` : '/profile?tab=offers' }; });
  }
  const hasMore = rows.length > 20; const displayed = rows.slice(0, 20); const last = displayed.at(-1);
  return <PageShell contentClassName="max-w-4xl">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">My Buying</h1><Link href="/messages" className="min-h-11 py-3 text-sm font-semibold text-teal-300">Messages →</Link></div>
    <p className="mt-2 text-sm leading-6 text-gray-400">Keep track of shoes you saved, asked about, or requested.</p>
    <nav aria-label="Buying status" className="my-5 flex gap-2 overflow-x-auto pb-2">{tabs.map((value, i) => <Link key={value} href={`/buying?tab=${value}`} aria-current={tab === value ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold ${tab === value ? 'bg-teal-500 text-gray-950' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'}`}>{labels[i]}</Link>)}</nav>
    {error ? <p role="alert" className="rounded-xl border border-gray-700 p-4 text-sm text-gray-300">Your buying activity is temporarily unavailable. Please try again shortly.</p> : displayed.length ? <div className="space-y-3">{displayed.map(row => <article key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4"><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold">{row.name}</h2><p className="mt-1 text-sm text-teal-300">{row.price != null ? formatPrice(row.price) : 'Free shoes'}<span className="ml-2 text-xs text-gray-400">{row.status}</span></p></div><Link href={row.href} className="inline-flex min-h-11 items-center rounded-lg border border-teal-600/60 px-3 text-sm font-semibold text-teal-200">{tab === 'saved' ? 'View shoes' : 'View conversation'}</Link></article>)}</div> : <div className="rounded-xl border border-gray-800 p-6"><p className="text-sm text-gray-400">No {labels[tabs.indexOf(tab)].toLowerCase()} yet.</p><Link href="/browse" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">Browse running shoes</Link></div>}
    {hasMore && last && <Link href={`/buying?tab=${tab}&before=${encodeURIComponent(last.created_at)}&id=${last.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">Older activity →</Link>}
  </PageShell>;
}
