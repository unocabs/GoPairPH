import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { MessagesWorkspace } from '@/components/messaging/MessagesWorkspace';
import type { Shoe } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages', robots: { index: false, follow: false } };

export default async function MessagesPage({ searchParams }: { searchParams: { conversation?: string; listing?: string; request?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const query = new URLSearchParams();
  for (const key of ['conversation', 'listing', 'request'] as const) if (z.string().uuid().safeParse(searchParams[key]).success) query.set(key, searchParams[key]!);
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/messages?${query}`)}`);
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/profile');
  let conversation = query.get('conversation');
  let listing: Shoe | null = null;
  if (query.has('request')) {
    const { data } = await supabase.from('purchase_requests').select('conversation_id').eq('id', query.get('request')!).maybeSingle();
    conversation = data?.conversation_id ?? null;
  }
  if (!conversation && query.has('listing')) {
    const id = query.get('listing')!;
    const { data: existing } = await supabase.from('chat_conversations').select('id').eq('listing_key', id).eq('buyer_id', profile.id).maybeSingle();
    conversation = existing?.id ?? null;
    if (!conversation) {
      const { data } = await supabase.from('shoes').select('id,slug,seller_id,brand,model,price_php,is_negotiable,listing_type,status,has_stock,inventory_mode,shop_id,size_eu,size_us,size_cm,us_size_type,profiles!shoes_seller_id_fkey(id,display_name,is_verified),shops(*),shoe_variants(*)').eq('id', id).maybeSingle();
      if (data && data.seller_id !== profile.id) listing = data as unknown as Shoe;
    }
  }
  return <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6">
    <div className="mb-3 flex items-center justify-between gap-3"><h1 className="text-lg font-semibold text-gray-100">Messages</h1><Link href="/buying" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-300">My Buying →</Link></div>
    <MessagesWorkspace profileId={profile.id} initialConversation={conversation} initialListing={listing} />
  </div>;
}
