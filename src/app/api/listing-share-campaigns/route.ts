import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getListingPath } from '@/lib/utils';

const listingIdSchema = z.string().uuid();

interface OwnedListing {
  id: string;
  slug: string | null;
  seller_id: string;
  status: string;
}

async function getOwnedListing(listingId: string): Promise<
  | { listing: OwnedListing }
  | { response: NextResponse }
> {
  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return { response: NextResponse.json({ error: 'Profile not found' }, { status: 400 }) };
  }

  const { data: listing } = await service
    .from('shoes')
    .select('id, slug, seller_id, status')
    .eq('id', listingId)
    .maybeSingle();

  if (!listing) {
    return { response: NextResponse.json({ error: 'Listing not found' }, { status: 404 }) };
  }

  if (listing.seller_id !== profile.id) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { listing: listing as OwnedListing };
}

async function getCampaignResponse(listing: OwnedListing) {
  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data: campaign, error } = await service
    .from('listing_share_campaigns')
    .select('id, started_at, expires_at')
    .eq('listing_id', listing.id)
    .is('replaced_at', null)
    .gt('expires_at', now)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not load share results' }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ campaign: null });
  }

  const { count, error: countError } = await service
    .from('listing_share_campaign_views')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id);

  if (countError) {
    return NextResponse.json({ error: 'Could not load share results' }, { status: 500 });
  }

  return NextResponse.json({
    campaign: {
      started_at: campaign.started_at,
      expires_at: campaign.expires_at,
      attributed_views: count ?? 0,
    },
  });
}

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get('listing_id');
  const parsed = listingIdSchema.safeParse(listingId);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const owned = await getOwnedListing(parsed.data);
  if ('response' in owned) return owned.response;
  return getCampaignResponse(owned.listing);
}

export async function POST(request: Request) {
  const parsed = z.object({ listing_id: listingIdSchema }).safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const owned = await getOwnedListing(parsed.data.listing_id);
  if ('response' in owned) return owned.response;
  if (owned.listing.status !== 'active') {
    return NextResponse.json({ error: 'Only active listings can be shared with tracking' }, { status: 400 });
  }

  const service = createServiceClient();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { data: campaign, error: insertError } = await service
    .from('listing_share_campaigns')
    .insert({
      listing_id: owned.listing.id,
      token: nanoid(20),
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token, started_at, expires_at')
    .single();

  if (insertError || !campaign) {
    return NextResponse.json({ error: 'Could not start share tracking' }, { status: 500 });
  }

  const { error: replaceError } = await service
    .from('listing_share_campaigns')
    .update({ replaced_at: startedAt.toISOString() })
    .eq('listing_id', owned.listing.id)
    .is('replaced_at', null)
    .neq('id', campaign.id);

  if (replaceError) {
    await service.from('listing_share_campaigns').delete().eq('id', campaign.id);
    return NextResponse.json({ error: 'Could not replace previous share tracking' }, { status: 500 });
  }

  const trackedPath = `${getListingPath(owned.listing)}?share=${encodeURIComponent(campaign.token)}`;
  return NextResponse.json({
    campaign: {
      started_at: campaign.started_at,
      expires_at: campaign.expires_at,
      attributed_views: 0,
      tracked_path: trackedPath,
    },
  });
}
