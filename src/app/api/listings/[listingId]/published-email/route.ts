import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { renderListingPublishedEmail } from '@/lib/email/listingPublished';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: { listingId: string } }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: listing } = await service
    .from('shoes')
    .select('id, slug, seller_id, brand, model')
    .eq('id', params.listingId)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.seller_id !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const listingName = formatListingName(listing.brand, listing.model);
  const listingUrl = getAbsoluteListingUrl(siteUrl, listing);
  try {
    await sendTransactionalEmail({
      category: 'listing_published',
      to: user.email,
      subject: `Your Go Pair PH listing is live: ${listingName}`,
      html: renderListingPublishedEmail({ listingName, listingUrl }),
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[listing-published-email] send failed', error);
    return NextResponse.json({ sent: false }, { status: 502 });
  }
}
