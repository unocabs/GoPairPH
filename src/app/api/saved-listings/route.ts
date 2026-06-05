import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSavedListingCount } from '@/lib/savedListings';

const bodySchema = z.object({
  listingId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from('shoes')
    .select('id, seller_id, status')
    .eq('id', parsed.listingId)
    .single();
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Only active pairs can be saved.' }, { status: 400 });
  }
  if (listing.seller_id === profile.id) {
    return NextResponse.json({ error: 'You cannot save your own pair.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('saved_listings')
    .insert({
      user_id: profile.id,
      listing_id: parsed.listingId,
    });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const saveCount = await getSavedListingCount(parsed.listingId);

  return NextResponse.json({ saved: true, saveCount });
}
