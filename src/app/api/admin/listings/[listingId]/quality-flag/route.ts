import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RequestBody {
  action?: unknown;
  reasons?: unknown;
  note?: unknown;
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  return profile?.is_admin ? supabase : null;
}

function invalidateHomepageListings() {
  revalidateTag('homepage-listings');
  revalidateTag('homepage-recently-sold-listings');
  revalidateTag('homepage-featured-listing');
  revalidatePath('/');
}

export async function PATCH(request: Request, { params }: { params: { listingId: string } }) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json().catch(() => null) as RequestBody | null;
  if (!body || (body.action !== 'flag' && body.action !== 'clear')) {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  if (body.action === 'clear') {
    const { error } = await supabase.rpc('admin_clear_listing_quality_flag', {
      p_listing_id: params.listingId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    invalidateHomepageListings();
    return NextResponse.json({ success: true });
  }

  const reasons = Array.isArray(body.reasons)
    ? body.reasons.filter((reason): reason is string => typeof reason === 'string' && reason.trim().length > 0)
    : [];
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (reasons.length === 0 && !note) {
    return NextResponse.json({ error: 'Choose at least one reason or add a short note.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('admin_flag_listing_quality', {
    p_listing_id: params.listingId,
    p_reasons: reasons,
    p_note: note || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  invalidateHomepageListings();
  return NextResponse.json({ success: true });
}
