import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSponsoredPromotionPrice, isSponsoredPaidDuration } from '@/lib/sponsoredPromotions';

export const runtime = 'nodejs';

interface RequestBody {
  listingId?: string;
  durationDays?: number;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as RequestBody;
  if (!body.listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  if (!isSponsoredPaidDuration(body.durationDays)) {
    return NextResponse.json({ error: 'Choose 7 or 30 days.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('id, is_verified')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (!profile.is_verified) {
    return NextResponse.json({ error: 'Only verified users can request Top Pick placement.' }, { status: 403 });
  }

  const { data: listing } = await service
    .from('shoes')
    .select('id, seller_id, status, sponsored_until')
    .eq('id', body.listingId)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.seller_id !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Only active listings can become Top Pick.' }, { status: 400 });
  }
  if (listing.sponsored_until && new Date(listing.sponsored_until).getTime() > Date.now()) {
    return NextResponse.json({ error: 'This listing is already a Top Pick.' }, { status: 400 });
  }

  const [{ count: activeCount }, { data: sponsored }] = await Promise.all([
    service
      .from('shoes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    service
      .from('shoes')
      .select('id')
      .eq('status', 'active')
      .gt('sponsored_until', new Date().toISOString()),
  ]);
  const cap = Math.max(1, Math.floor((activeCount ?? 0) * 0.15));
  if ((sponsored?.length ?? 0) >= cap) {
    return NextResponse.json({ error: 'Top Pick slots are full right now.' }, { status: 400 });
  }

  const pricePhp = getSponsoredPromotionPrice(body.durationDays);
  const { data, error } = await supabase.rpc('create_sponsored_paid_reservation', {
    p_listing_id: body.listingId,
    p_duration_days: body.durationDays,
    p_price_php: pricePhp,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: data });
}
