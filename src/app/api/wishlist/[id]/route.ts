import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: { id: string };
}

// Hydration endpoint for deep-linked modals: ?item=<id> visited cold.
// Returns the full item, images, and offers (each with a display_name when attributed).
export async function GET(_req: Request, { params }: RouteContext) {
  const supabase = createClient();

  const { data: item, error: itemErr } = await supabase
    .from('wishlist_items')
    .select('*, wishlist_images(*)')
    .eq('id', params.id)
    .single();

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: offers } = await supabase
    .from('wishlist_offers')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('wishlist_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ item, offers: offers ?? [] });
}
