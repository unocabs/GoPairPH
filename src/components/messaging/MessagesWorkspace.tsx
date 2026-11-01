'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatUpdates } from '@/hooks/useChatUpdates';
import { messageQuestions, sellerReplies, MESSAGE_MAX_LENGTH } from '@/lib/messaging/config';
import type { ChatMessage, ConversationSummary, ThreadData } from '@/lib/messaging/types';
import { buildMessengerUrl } from '@/lib/facebook';
import { formatListingName, formatPrice, formatSize, getListingPath, getPublicUrl, IMAGE_TRANSFORM_PRESETS } from '@/lib/utils';
import { getListingAvailability } from '@/lib/listingAvailability';
import { BuyButton } from '@/components/purchases/BuyButton';
import { BuyModal } from '@/components/purchases/BuyModal';
import { DonateRequestButton } from '@/components/purchases/DonateRequestButton';
import { OfferActions } from './OfferActions';
import type { PurchaseRequest, Shoe } from '@/types';

function mergeMessages(old: ChatMessage[], incoming: ChatMessage[]) {
  return Array.from(new Map([...old, ...incoming].map(m => [m.id, m])).values()).sort((a, b) => a.sequence - b.sequence);
}
async function jsonResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Please try again.');
  return body;
}
function MessageText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) => /^https?:\/\//.test(part)
    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">{part}</a> : part)}</>;
}

export function MessagesWorkspace({ profileId, initialConversation, initialListing }: {
  profileId: string; initialConversation: string | null; initialListing: Shoe | null;
}) {
  const [selected, setSelected] = useState(initialConversation);
  const [composing, setComposing] = useState(Boolean(initialListing && !initialConversation));
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [archived, setArchived] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fetching = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const body = await jsonResponse(await fetch(`/api/messages?archived=${archived}`, { cache: 'no-store' }));
      setConversations(body.conversations); setHasMore(body.conversations.length === 20); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load messages.'); }
    finally { fetching.current = false; setLoading(false); }
  }, [archived]);
  useChatUpdates(`inbox:${profileId}`, refresh);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const resize = () => {
      const node = workspace.current; if (!node) return;
      const height = window.visualViewport?.height ?? window.innerHeight;
      node.style.height = `${Math.max(180, height - node.getBoundingClientRect().top - 12)}px`;
    };
    resize(); window.visualViewport?.addEventListener('resize', resize); window.addEventListener('resize', resize);
    return () => { window.visualViewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); };
  }, [selected, composing]);
  const open = (id: string | null) => {
    setSelected(id); setComposing(false);
    window.history.pushState(null, '', id ? `/messages?conversation=${id}` : '/messages');
  };
  useEffect(() => {
    const back = () => { const q = new URLSearchParams(window.location.search); setSelected(q.get('conversation')); setComposing(Boolean(q.get('listing') && initialListing)); };
    window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back);
  }, [initialListing]);
  async function olderInbox() {
    const last = conversations.at(-1); if (!last || fetching.current) return;
    fetching.current = true;
    try {
      const body = await jsonResponse(await fetch(`/api/messages?archived=${archived}&before=${encodeURIComponent(last.last_message_at)}&id=${last.id}`, { cache: 'no-store' }));
      setConversations(current => Array.from(new Map<string, ConversationSummary>([...current, ...body.conversations].map(c => [c.id, c])).values())); setHasMore(body.conversations.length === 20);
    } catch { setError('Could not load older conversations.'); }
    finally { fetching.current = false; }
  }
  const showingThread = Boolean(selected || composing);
  return <div ref={workspace} className="grid h-[70dvh] min-h-0 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className={`${showingThread ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col lg:border-r lg:border-gray-800`}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 p-3"><h2 className="font-semibold">Messages</h2><button type="button" aria-pressed={archived} onClick={() => { setArchived(!archived); setConversations([]); }} className="min-h-11 rounded-lg px-3 text-xs text-gray-300 hover:bg-gray-800">{archived ? 'Show inbox' : 'Archived'}</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-gray-400" role="status">Loading your conversations…</p>}
        {error && <div className="p-4"><p role="alert" className="text-sm text-red-300">{error}</p><button className="mt-2 min-h-11 text-sm underline" onClick={() => void refresh()}>Try again</button></div>}
        {!loading && !error && !conversations.length && <div className="p-5 text-sm leading-6 text-gray-400">{archived ? 'No archived conversations.' : 'Ask about shoes from a listing. Your messages and offers will appear here.'}<Link href="/browse" className="mt-3 block font-semibold text-teal-300">Browse shoes</Link></div>}
        {conversations.map(c => <button type="button" key={c.id} onClick={() => open(c.id)} aria-current={selected === c.id ? 'true' : undefined} className={`flex min-h-[88px] w-full items-start gap-3 border-b border-gray-800/60 p-4 text-left transition-colors ${selected === c.id ? 'bg-teal-950/45' : 'hover:bg-gray-900'}`}>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-gray-100">{c.partner_name}</p>{c.unread > 0 && !c.muted && <span className="shrink-0 rounded-full bg-teal-400 px-1.5 text-xs font-bold text-gray-950">{c.unread}</span>}</div><p className="mt-1 truncate text-xs text-teal-200/80">{c.listing_snapshot.name}</p><p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-400">{c.last_message || 'View your request'}{c.muted ? ' · Muted' : ''}</p></div>
        </button>)}
        {hasMore && <button type="button" onClick={olderInbox} className="min-h-11 w-full p-3 text-sm text-teal-300">Load older conversations</button>}
      </div>
    </aside>
    <section className={`${showingThread ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`}>
      {showingThread ? <Conversation key={selected ?? `new:${initialListing?.id}`} id={selected} initialListing={initialListing} profileId={profileId} onCreated={id => { open(id); void refresh(); }} onBack={() => open(null)} onInboxChanged={() => void refresh()} />
        : <div className="m-auto p-8 text-center"><p className="font-semibold text-gray-200">Your next shoes, one conversation away.</p><p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">Choose a conversation to reply, check an offer, or arrange your purchase.</p><Link href="/buying" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">View My Buying</Link></div>}
    </section>
  </div>;
}

function Conversation({ id, initialListing, profileId, onCreated, onBack, onInboxChanged }: {
  id: string | null; initialListing: Shoe | null; profileId: string; onCreated: (id: string) => void; onBack: () => void; onInboxChanged: () => void;
}) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [more, setMore] = useState(false);
  const [older, setOlder] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [report, setReport] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState<PurchaseRequest | null>(null);
  const [failed, setFailed] = useState<{ clientId: string; body: string } | null>(null);
  const retry = useRef<{ clientId: string; body: string } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const latestSequence = useRef(0);
  const fetching = useRef(false);
  const queued = useRef(false);
  const alive = useRef(true);
  const readSequence = useRef(0);
  const draftKey = `gopair-draft:${profileId}:${id ?? initialListing?.id}`;
  const listing = data?.listing ?? (!id ? initialListing : null);
  const seller = data ? data.conversation.seller_id === profileId : false;
  const name = data?.conversation.listing_snapshot.name ?? (listing ? formatListingName(listing.brand, listing.model) : 'Shoes');
  const muted = data ? (seller ? data.conversation.seller_muted : data.conversation.buyer_muted) : false;
  const archived = data ? (seller ? data.conversation.seller_archived : data.conversation.buyer_archived) : false;
  const presets = seller ? sellerReplies : [...(listing?.inventory_mode === 'multi' ? ['Is my size available?'] : []), ...messageQuestions(listing?.listing_type ?? data?.conversation.listing_snapshot.listing_type ?? 'for_sale', listing?.is_negotiable)];

  const refresh = useCallback(async () => {
    if (!id || !alive.current) return;
    if (fetching.current) { queued.current = true; return; }
    fetching.current = true;
    const nearBottom = !scroll.current || scroll.current.scrollHeight - scroll.current.scrollTop - scroll.current.clientHeight < 100;
    try {
      let cursor = latestSequence.current;
      let body: ThreadData;
      do {
        body = await jsonResponse(await fetch(`/api/messages/${id}${cursor ? `?after=${cursor}` : ''}`, { cache: 'no-store' }));
        if (!alive.current) return;
        setData(body); setMessages(current => mergeMessages(current, body.messages));
        if (!cursor) setOlder(body.has_more);
        const next = body.messages.at(-1)?.sequence ?? cursor;
        latestSequence.current = Math.max(latestSequence.current, next);
        if (!cursor || !body.has_more || next <= cursor) break;
        cursor = next;
      } while (alive.current);
      setError('');
      if (nearBottom) requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: 'nearest' }));
      else setNewMessages(true);
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not load conversation.'); }
    finally {
      fetching.current = false; if (alive.current) setLoading(false);
      if (queued.current && alive.current) { queued.current = false; void refresh(); }
    }
  }, [id]);
  useChatUpdates(id ? `chat:${id}` : null, refresh);
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; }; }, [refresh]);
  useEffect(() => {
    try { setDraft(sessionStorage.getItem(draftKey) ?? ''); } catch { /* Storage may be disabled. */ }
    setRestored(true);
  }, [draftKey]);
  useEffect(() => { if (restored) { try { sessionStorage.setItem(draftKey, draft); } catch { /* Optional draft persistence. */ } } }, [draftKey, draft, restored]);

  useEffect(() => {
    if (!id || !bottom.current || !scroll.current) return;
    let atBottom = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const mark = async () => {
      const seq = latestSequence.current;
      if (document.hidden || !atBottom || seq <= readSequence.current) return;
      try {
        await jsonResponse(await fetch(`/api/messages/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', sequence: seq }) }));
        readSequence.current = Math.max(readSequence.current, seq); setNewMessages(false);
      } catch { retryTimer = setTimeout(() => void mark(), 5000); }
    };
    const observer = new IntersectionObserver(entries => { atBottom = Boolean(entries[0]?.isIntersecting); if (atBottom) void mark(); }, { root: scroll.current, threshold: 1 });
    observer.observe(bottom.current);
    const visible = () => { const node = scroll.current; if (node && node.scrollHeight - node.scrollTop - node.clientHeight < 40) void mark(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => { clearTimeout(retryTimer); observer.disconnect(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible); };
  }, [id, messages.length]);

  async function send(value = draft, existingClient?: string) {
    const text = value.trim(); if (!text || sending || text.length > MESSAGE_MAX_LENGTH || data?.blocked) return;
    const clientId = existingClient ?? (retry.current?.body === text ? retry.current.clientId : crypto.randomUUID());
    retry.current = { clientId, body: text }; setSending(true); setError(''); setFailed(null);
    try {
      const response = await jsonResponse(await fetch(id ? `/api/messages/${id}` : '/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, client_id: clientId, ...(!id ? { listing_id: initialListing?.id } : {}) }),
      }));
      if (draft.trim() === text) { setDraft(''); try { sessionStorage.removeItem(draftKey); } catch { /* Optional persistence. */ } } retry.current = null;
      if (!id) { onCreated(response.conversation_id); return; }
      setMessages(current => mergeMessages(current, [response.message]));
      latestSequence.current = Math.max(latestSequence.current, response.message.sequence);
      requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: 'nearest' }));
      void refresh();
    } catch (e) { setFailed({ clientId, body: text }); setError(e instanceof Error ? e.message : 'Message not sent.'); }
    finally { setSending(false); }
  }
  async function action(payload: Record<string, unknown>) {
    if (!id) return;
    try {
      await jsonResponse(await fetch(`/api/messages/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      if (payload.action === 'report') { setReporting(false); setNotice('Report received. Our team can review this conversation.'); }
      await refresh(); onInboxChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
  }
  async function olderMessages() {
    if (!id || !messages.length) return;
    const node = scroll.current; const height = node?.scrollHeight ?? 0;
    try {
      const body: ThreadData = await jsonResponse(await fetch(`/api/messages/${id}?before=${messages[0].sequence}`, { cache: 'no-store' }));
      setMessages(current => mergeMessages(current, body.messages)); setOlder(body.has_more);
      requestAnimationFrame(() => { if (node) node.scrollTop += node.scrollHeight - height; });
    } catch { setError('Could not load older messages.'); }
  }
  function choosePreset(text: string) {
    if (draft.trim() && !window.confirm('Replace your draft with this suggestion?')) return;
    setDraft(text);
  }
  const snapshot = data?.conversation.listing_snapshot;
  const thumbnail = snapshot?.thumbnail ? getPublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, snapshot.thumbnail, 'shoe-images', IMAGE_TRANSFORM_PRESETS.purchaseThumb) : null;
  const activeRequests = data?.requests.filter(r => r.status === 'pending' || r.status === 'accepted') ?? [];
  const earlierNotes = data?.requests.filter(r => r.created_at < data.conversation.created_at && (r.message || (r.seller_message && (r.seller_message_at ?? '') < data.conversation.created_at))) ?? [];
  const canRequest = listing && getListingAvailability(listing).canRequest && !seller && !data?.blocked;
  const contact = buildMessengerUrl(listing?.shops?.fb_page_url) ?? buildMessengerUrl(data?.partner.fb_username);
  return <>
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-800 px-3 py-2">
      <button type="button" onClick={onBack} aria-label="Back to messages" className="min-h-11 min-w-11 rounded-lg text-xl hover:bg-gray-800 lg:hidden">‹</button>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{data?.partner.display_name ?? listing?.profiles?.display_name ?? 'Ask the seller'}</p><p className="text-xs text-gray-400">{data?.partner.is_verified ? 'Verified profile · ' : ''}Go Pair PH chat</p></div>
      {id && <details className="relative"><summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg text-xl hover:bg-gray-800" aria-label="Conversation options">⋯</summary><div className="absolute right-0 top-full z-20 w-56 rounded-xl border border-gray-700 bg-gray-900 p-2 shadow-xl">
        <button type="button" onClick={() => void action({ action: 'preferences', muted: !muted })} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-gray-800">{muted ? 'Unmute alerts' : 'Mute alerts'}</button>
        <button type="button" onClick={() => void action({ action: 'preferences', archived: !archived })} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-gray-800">{archived ? 'Move to inbox' : 'Archive conversation'}</button>
        {contact && <a href={contact} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-gray-800">Continue on Messenger</a>}
        <button type="button" onClick={() => setReporting(true)} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-gray-800">Report conversation</button>
        <button type="button" onClick={() => { if (data?.blocked_by_me || window.confirm('Block this person? New messages and offers between you will stop. Your conversation history stays available.')) void action({ action: 'block', blocked: !data?.blocked_by_me }); }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-red-300 hover:bg-gray-800">{data?.blocked_by_me ? 'Unblock this person' : 'Block this person'}</button>
      </div></details>}
    </div>
    <div className="shrink-0 border-b border-gray-800 bg-gray-900/60 p-3">
      <div className="flex items-center gap-3">{thumbnail && <Image src={thumbnail} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}<div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><p className="mt-0.5 text-xs text-gray-300">{listing?.price_php != null ? formatPrice(listing.price_php) : snapshot?.price_php != null ? formatPrice(snapshot.price_php) : loading ? 'Loading listing details…' : 'Free shoes'}{listing ? ` · ${formatSize(listing.size_eu, listing.size_us, listing.size_cm, listing.us_size_type) || 'Choose a size'} · ${getListingAvailability(listing).label}` : data ? ' · Listing removed' : ''}</p></div>{listing && <Link href={getListingPath(listing)} className="flex min-h-11 shrink-0 items-center text-xs font-semibold text-teal-300">View listing</Link>}</div>
      {activeRequests.length > 0 ? <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">{activeRequests.map(r => <OfferActions key={r.id} request={r} seller={seller} blocked={data?.blocked} onChanged={() => { void refresh(); onInboxChanged(); }} onRevise={listing?.is_negotiable ? () => setRevision(r) : undefined} />)}</div> : canRequest && <div className="mt-2">{listing.listing_type === 'donate' ? <DonateRequestButton listingId={listing.id} listingName={name} requesterId={profileId} onSubmitted={(conversationId) => { if (!id && conversationId) onCreated(conversationId); else void refresh(); }} /> : <BuyButton listingId={listing.id} listingName={name} priceFormatted={formatPrice(listing.price_php!)} pricePhp={listing.price_php!} isNegotiable={listing.is_negotiable} shop={listing.shops} variants={listing.inventory_mode === 'multi' ? listing.shoe_variants : undefined} buyerProfileId={profileId} showOfferCount={false} label={listing.shop_id ? 'Place Order' : listing.is_negotiable ? 'Send Offer' : 'Request to Buy'} onSubmitted={(conversationId) => { if (!id && conversationId) onCreated(conversationId); else void refresh(); }} className="min-h-11 w-full rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400" />}</div>}
    </div>
    {reporting && <form onSubmit={e => { e.preventDefault(); void action({ action: 'report', reason: report }); }} className="shrink-0 space-y-2 border-b border-gray-800 p-3"><label className="block text-sm" htmlFor="chat-report">What happened?</label><textarea id="chat-report" minLength={5} maxLength={1000} required value={report} onChange={e => setReport(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 p-2 text-base" rows={2} /><div className="flex gap-3"><button className="min-h-11 text-sm font-semibold text-teal-300">Send report</button><button type="button" onClick={() => setReporting(false)} className="min-h-11 text-sm text-gray-400">Cancel</button></div></form>}
    <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4" role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions">
      {loading && <p className="text-sm text-gray-400" role="status">Loading conversation…</p>}
      {older && <button type="button" onClick={olderMessages} className="mb-3 min-h-11 w-full text-sm text-teal-300">Load older messages</button>}
      {earlierNotes.length > 0 && <details className="mb-4 rounded-lg border border-gray-700 p-3"><summary className="min-h-11 cursor-pointer text-sm text-gray-300">Earlier request notes</summary>{earlierNotes.map(r => <div key={r.id} className="mt-2 space-y-2 border-t border-gray-800 pt-2 text-sm text-gray-400">{r.message && <p className="whitespace-pre-wrap break-words">Buyer: {r.message}</p>}{r.seller_message && (r.seller_message_at ?? '') < data!.conversation.created_at && <p className="whitespace-pre-wrap break-words">Seller: {r.seller_message}</p>}</div>)}</details>}
      {!loading && !messages.length && <p className="mx-auto max-w-sm py-5 text-center text-sm leading-6 text-gray-400">Ask about condition, fit, meetup, or shipping. You can send an offer whenever you’re ready.</p>}
      {messages.map(m => <div key={m.id} className={`mb-3 flex ${m.kind === 'offer' ? 'justify-center' : m.sender_id === profileId ? 'justify-end' : 'justify-start'}`}><div className={m.kind === 'offer' ? 'max-w-[95%] rounded-lg border border-teal-800/60 bg-teal-950/25 px-3 py-2 text-center text-xs leading-5 text-teal-100' : `max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-6 [overflow-wrap:anywhere] sm:max-w-[80%] ${m.sender_id === profileId ? 'rounded-br-sm bg-teal-800 text-white' : 'rounded-bl-sm bg-gray-800 text-gray-100'}`}>
        <MessageText text={m.body} /><time dateTime={m.created_at} className="mt-1 block text-[11px] opacity-65">{new Date(m.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}{m.sender_id === profileId && m.kind === 'text' ? ' · Sent' : ''}</time>
      </div></div>)}
      {sending && <div className="mb-3 flex justify-end" role="status"><div className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl bg-teal-800/60 px-3 py-2 text-sm leading-6 text-gray-100 [overflow-wrap:anywhere]"><MessageText text={retry.current?.body ?? ''} /><span className="block text-xs text-gray-400">Sending…</span></div></div>}
      <div ref={bottom} className="h-px" />
    </div>
    {newMessages && <button type="button" onClick={() => bottom.current?.scrollIntoView({ block: 'nearest' })} className="shrink-0 py-2 text-sm font-semibold text-teal-300">New messages ↓</button>}
    {notice && <p role="status" className="shrink-0 px-3 py-1 text-xs text-teal-200">{notice}</p>}
    {error && <div role="alert" className="shrink-0 px-3 py-2 text-sm text-red-300">{error}{/sign in|unauthorized/i.test(error) ? <Link href={`/auth/sign-in?next=${encodeURIComponent(id ? `/messages?conversation=${id}` : `/messages?listing=${initialListing?.id}`)}`} className="ml-2 inline-flex min-h-11 items-center underline">Sign in again</Link> : failed ? <button type="button" disabled={sending} onClick={() => void send(failed.body, failed.clientId)} className="ml-2 min-h-11 underline">Retry message</button> : <button type="button" onClick={() => void refresh()} className="ml-2 min-h-11 underline">Refresh</button>}</div>}
    {data?.blocked ? <p className="shrink-0 border-t border-gray-800 p-4 text-sm text-gray-400">Messaging between these accounts is blocked. Your history remains available.</p> : <form onSubmit={e => { e.preventDefault(); void send(); }} className="shrink-0 border-t border-gray-800 bg-gray-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="chat-shortcuts mb-2 flex items-start gap-2"><span className="sr-only">{seller ? 'Quick replies' : 'Quick questions'}</span><div className={`flex min-w-0 flex-1 gap-2 pb-1 ${more ? 'max-h-28 flex-wrap overflow-y-auto' : 'overflow-x-auto'}`}>{(more ? presets : presets.slice(0, 3)).map(text => <button key={text} type="button" onClick={() => { choosePreset(text); setMore(false); }} className="min-h-11 max-w-[230px] shrink-0 rounded-xl border border-gray-700 px-3 py-2 text-left text-xs text-gray-300 hover:border-teal-600">{text}</button>)}</div>{presets.length > 3 && <button type="button" onClick={() => setMore(!more)} aria-label={seller ? 'More replies' : 'More questions'} aria-expanded={more} className="min-h-11 shrink-0 px-2 text-xs font-semibold text-teal-300">{more ? 'Less' : 'More'}</button>}</div>
      <div className="flex items-end gap-2"><label htmlFor="chat-draft" className="sr-only">Message</label><textarea id="chat-draft" value={draft} onChange={e => setDraft(e.target.value)} disabled={sending} rows={2} maxLength={MESSAGE_MAX_LENGTH} placeholder={seller ? 'Reply to the buyer…' : 'Ask the seller…'} className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-100 placeholder:text-gray-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60" /><button type="submit" disabled={sending || !draft.trim() || Boolean(id && !data)} className="min-h-11 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-gray-950 hover:bg-teal-400 disabled:opacity-40">Send</button></div>
      {draft.length > 1800 && <p className="mt-1 text-right text-xs text-gray-400">{draft.length}/{MESSAGE_MAX_LENGTH}</p>}
    </form>}
    {revision && listing && <BuyModal listingId={listing.id} listingName={name} priceFormatted={formatPrice(listing.price_php!)} pricePhp={listing.price_php!} isNegotiable={listing.is_negotiable} shop={listing.shops} variants={listing.inventory_mode === 'multi' ? listing.shoe_variants : undefined} initialVariantId={revision.variant_id} requestId={revision.id} requestVersion={revision.version} initialOfferPrice={revision.offer_price_php} onClose={() => setRevision(null)} onSubmitted={() => { setRevision(null); void refresh(); }} />}
  </>;
}
