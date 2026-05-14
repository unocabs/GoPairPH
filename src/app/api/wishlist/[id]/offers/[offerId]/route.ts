import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface RouteContext {
  params: {
    id: string;
    offerId: string;
  };
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to delete a lead.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: offer } = await service
    .from('wishlist_offers')
    .select('id, wishlist_id, offerer_id')
    .eq('id', params.offerId)
    .eq('wishlist_id', params.id)
    .single();

  if (!offer) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const canDelete = profile.is_admin || offer.offerer_id === profile.id;
  if (!canDelete) {
    return NextResponse.json({ error: "You can't delete this lead." }, { status: 403 });
  }

  const { error } = await service
    .from('wishlist_offers')
    .delete()
    .eq('id', params.offerId)
    .eq('wishlist_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
