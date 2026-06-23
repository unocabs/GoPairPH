import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function canRun(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (secret && authHeader === `Bearer ${secret}`) return true;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

export async function POST(request: Request) {
  if (!await canRun(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const [{ data: awarded, error: awardError }, { data: released, error: releaseError }, { data: expired, error: expireError }] = await Promise.all([
    service.rpc('gp_coin_process_pending_awards'),
    service.rpc('gp_coin_release_expired_featured_reservations'),
    service.rpc('gp_coin_expire_available', { p_profile_id: null }),
  ]);

  if (awardError || releaseError || expireError) {
    return NextResponse.json({
      error: awardError?.message ?? releaseError?.message ?? expireError?.message ?? 'Could not process GP Coins',
    }, { status: 500 });
  }

  return NextResponse.json({
    pendingAwardsProcessed: awarded ?? 0,
    expiredReservationsReleased: released ?? 0,
    coinsExpired: expired ?? 0,
  });
}
