import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RequestBody {
  profileId?: string;
  amountDelta?: number;
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

  const body = await request.json().catch(() => ({})) as RequestBody;
  const amountDelta = Math.trunc(Number(body.amountDelta ?? 0));
  if (!body.profileId) return NextResponse.json({ error: 'Choose a profile.' }, { status: 400 });
  if (amountDelta === 0) return NextResponse.json({ error: 'Amount cannot be zero.' }, { status: 400 });
  if (!body.reason?.trim()) return NextResponse.json({ error: 'Reason is required.' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.rpc('gp_coin_admin_adjust', {
    p_profile_id: body.profileId,
    p_amount_delta: amountDelta,
    p_reason: body.reason.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transaction: data });
}
