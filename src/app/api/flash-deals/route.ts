import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { paymentUser } from '@/lib/payments/server';
import { getListingPath } from '@/lib/utils';
export const runtime = 'nodejs';

const selection = z.object({ listingId: z.string().uuid(), price: z.number().positive().max(99999999.99).multipleOf(0.01), clientId: z.string().uuid() });
export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = selection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose your shoes and enter a valid sale price.' }, { status: 400 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in to start a flash deal.' }, { status: 401 });
  const service = createServiceClient();
  const { data, error } = await service.rpc('start_flash_deal', {
    p_seller: auth.profile.id, p_listing: parsed.data.listingId, p_price: parsed.data.price, p_client: parsed.data.clientId,
  });
  if (error) return NextResponse.json({ error: error.code === 'PGRST202' ? 'Flash Deals is not available yet. Your coins have not been spent.' : error.message }, { status: 409 });
  const { data: listing } = await service.from('shoes').select('id,slug,shop_id,shops(slug)').eq('id', data.listing_id).single();
  revalidateTag('homepage-listings'); revalidateTag('flash-deals');
  return NextResponse.json({ deal: data, listingUrl: listing ? getListingPath(listing as Parameters<typeof getListingPath>[0]) : `/listings/${data.listing_id}` });
}

export async function DELETE(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const parsed = z.object({ dealId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid flash deal.' }, { status: 400 });
  const auth = await paymentUser();
  if (!auth) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { error } = await createServiceClient().rpc('end_flash_deal', { p_seller: auth.profile.id, p_id: parsed.data.dealId });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  revalidateTag('homepage-listings'); revalidateTag('flash-deals');
  return NextResponse.json({ ended: true });
}
