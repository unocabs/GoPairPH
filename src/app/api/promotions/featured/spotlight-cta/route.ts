import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      branch: 'none',
      href: '/listings/new',
      label: 'Add Listing',
      message: 'Add your shoes to Go Pair PH. Selected listings may also be promoted for free.',
    });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('id, is_verified')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({
      branch: 'none',
      href: '/listings/new',
      label: 'Add Listing',
      message: 'Add your shoes to Go Pair PH. Selected listings may also be promoted for free.',
    });
  }

  const { data: listings } = await service
    .from('shoes')
    .select('id, slug')
    .eq('seller_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(2);

  const active = listings ?? [];
  if (active.length > 0 && !profile.is_verified) {
    return NextResponse.json({
      branch: 'unverified',
      href: '/profile#verification',
      label: 'Request Verification',
      message: 'Promote listing is available after verification. Request verification first so you can feature your shoes.',
    });
  }

  if (active.length === 1) {
    const listing = active[0];
    return NextResponse.json({
      branch: 'one',
      href: `/listings/${listing.slug ?? listing.id}?promote=featured`,
      label: 'Feature My Shoes',
      message: 'Want your pair in the spotlight? Promote your listing on the Go Pair PH homepage.',
    });
  }

  if (active.length >= 2) {
    return NextResponse.json({
      branch: 'multiple',
      href: '/profile#active-listings',
      label: 'Choose a Listing',
      message: 'Want one of your pairs in the spotlight? Choose an active listing to promote.',
    });
  }

  return NextResponse.json({
    branch: 'none',
    href: '/listings/new',
    label: 'Add Listing',
    message: 'Add your shoes to Go Pair PH. Selected listings may also be promoted for free.',
  });
}
