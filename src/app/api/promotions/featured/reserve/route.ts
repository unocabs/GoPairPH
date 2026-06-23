import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getFeaturedPromotionPrice, isFeaturedPaidDuration } from '@/lib/featuredPromotions';

export const runtime = 'nodejs';

interface RequestBody {
  listingId?: string;
  durationDays?: number;
  coinsToUse?: number;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as RequestBody;
  if (!body.listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  if (!isFeaturedPaidDuration(body.durationDays)) {
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
    return NextResponse.json({ error: 'Only verified users can request Featured placement.' }, { status: 403 });
  }

  const { data: listing } = await service
    .from('shoes')
    .select('id, seller_id, status')
    .eq('id', body.listingId)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.seller_id !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Only active listings can be Featured.' }, { status: 400 });
  }

  const pricePhp = getFeaturedPromotionPrice(body.durationDays);
  const coinsToUse = Math.max(0, Math.floor(Number(body.coinsToUse ?? 0)));
  if (coinsToUse % 2 !== 0) {
    return NextResponse.json({ error: 'Use an even GP Coin amount.' }, { status: 400 });
  }
  if (coinsToUse > pricePhp * 2) {
    return NextResponse.json({ error: 'GP Coins cannot exceed the Featured price.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('create_featured_paid_reservation', {
    p_listing_id: body.listingId,
    p_duration_days: body.durationDays,
    p_price_php: pricePhp,
    p_coins_to_use: coinsToUse,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: data });
}
