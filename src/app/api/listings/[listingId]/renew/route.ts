import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyListingRenewalToken } from '@/lib/listingRenewal';
import { createServiceClient } from '@/lib/supabase/server';
import { getListingPath } from '@/lib/utils';

export const runtime = 'nodejs';

function redirectWithError(request: Request, error: string) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/browse?renew_error=${encodeURIComponent(error)}`);
}

export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const { searchParams, origin } = new URL(request.url);
  const token = verifyListingRenewalToken(searchParams.get('token'));

  if (!token || token.listingId !== params.listingId) {
    return redirectWithError(request, 'invalid');
  }

  const service = createServiceClient();
  const { data: listing, error: listingError } = await service
    .from('shoes')
    .select('id, slug, seller_id, status')
    .eq('id', token.listingId)
    .single();

  if (listingError || !listing) {
    return redirectWithError(request, 'not_found');
  }

  if (listing.seller_id !== token.sellerId || listing.status !== 'active') {
    return redirectWithError(request, 'forbidden');
  }

  const renewedAt = new Date().toISOString();
  const { error: updateError } = await service
    .from('shoes')
    .update({ renewed_at: renewedAt })
    .eq('id', token.listingId)
    .eq('seller_id', token.sellerId)
    .eq('status', 'active');

  if (updateError) {
    console.error('[listing-renewal] renew failed', updateError);
    return redirectWithError(request, 'failed');
  }

  const listingPath = getListingPath(listing);
  revalidateTag('homepage-listings');
  revalidateTag('homepage-featured-listing');
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath(listingPath);

  return NextResponse.redirect(`${origin}${listingPath}?renewed=1`);
}
