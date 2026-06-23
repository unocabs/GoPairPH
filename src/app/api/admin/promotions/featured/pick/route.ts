import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface PostBody {
  listingId?: string;
  durationDays?: number;
  forceReplacePaid?: boolean;
  reason?: string;
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
  return profile?.is_admin ? profile : null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as PostBody;
  if (!body.listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  if (![7, 30, 90].includes(body.durationDays ?? 0)) {
    return NextResponse.json({ error: 'Choose 7, 30, or 90 days.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { count } = await service
    .from('featured_promotion_orders')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'paid')
    .in('status', ['active', 'queued']);

  if ((count ?? 0) > 0 && !body.forceReplacePaid) {
    const { data: currentPaid } = await service
      .from('featured_promotion_orders')
      .select('id, price_php, duration_days, scheduled_end_at, listing:shoes!featured_promotion_orders_listing_id_fkey(id, brand, model)')
      .eq('source', 'paid')
      .in('status', ['active', 'queued'])
      .order('scheduled_start_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      error: 'Paid Featured promotion exists',
      currentPaid,
    }, { status: 409 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_create_featured_pick', {
    p_listing_id: body.listingId,
    p_duration_days: body.durationDays,
    p_force_replace_paid: Boolean(body.forceReplacePaid),
    p_reason: body.reason ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: data });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { listingId?: string; reason?: string };
  if (!body.listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.rpc('admin_unfeature_listing', {
    p_listing_id: body.listingId,
    p_reason: body.reason ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
