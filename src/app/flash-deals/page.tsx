import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { FlashDealsSection } from '@/components/home/FlashDealsSection';
import { getFlashDeals } from '@/lib/flashDealsServer';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Flash Deals — Running Shoes', description: 'Limited-time seller discounts on running shoes. Check sizes, condition, and availability on Go Pair PH.' };

export default async function FlashDealsPage() {
  const client = createClient();
  const [{ data: { user } }, shoes] = await Promise.all([client.auth.getUser(), getFlashDeals()]);
  const { data: profile } = user ? await client.from('profiles').select('id').eq('user_id', user.id).maybeSingle() : { data: null };
  return <PageShell><Link href="/browse" className="mb-5 inline-flex min-h-11 items-center text-sm text-teal-300">← Browse all shoes</Link>
    <PageHeader eyebrow="Promoted · seller discounts" title="Flash Deals" subtitle="Real price drops on running shoes, for up to 24 hours. Check the size and condition, then message the seller." />
    <FlashDealsSection shoes={shoes} currentProfileId={profile?.id} all />
    <p className="mt-5 max-w-2xl text-xs leading-5 text-gray-400">Sellers fund these discounts and use GP Coins for promotion. A flash deal does not guarantee availability or replace your usual checks. Deals end at the displayed time or when the shoes are reserved or sold.</p>
  </PageShell>;
}
