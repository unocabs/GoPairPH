import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAdminNotificationEmails, renderAdminActionEmail } from '@/lib/email/adminNotifications';
import { sendTransactionalEmail } from '@/lib/email/resend';

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

async function processGpCoins(request: Request) {
  if (!await canRun(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const now = new Date().toISOString();
  const { count: dueAwardCount, error: dueCountError } = await service
    .from('gp_coin_pending_awards')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('eligible_at', now);

  if (dueCountError) {
    return NextResponse.json({ error: dueCountError.message }, { status: 500 });
  }

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

  if ((dueAwardCount ?? 0) > 0) {
    try {
      const admins = await getAdminNotificationEmails(service);
      if (admins.length > 0) {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
        await sendTransactionalEmail({
          category: 'admin_notification',
          to: admins,
          subject: `GP Coin processing summary: ${dueAwardCount} due`,
          html: renderAdminActionEmail({
            title: 'GP Coin processing complete',
            intro: 'The scheduled GP Coin maintenance run processed the awards that had reached their eligibility time.',
            rows: [
              { label: 'Due awards reviewed', value: dueAwardCount ?? 0 },
              { label: 'Awards granted', value: Number(awarded ?? 0) },
              { label: 'Featured reservations released', value: Number(released ?? 0) },
              { label: 'Coin buckets expired', value: Number(expired ?? 0) },
            ],
            adminUrl: `${siteUrl}/admin?tab=promotions`,
            buttonLabel: 'Open GP Coin admin',
          }),
          tags: { notification: 'gp_coin_processing' },
        });
      }
    } catch (emailError) {
      console.error('[gp-coins/process] admin summary email failed', emailError);
    }
  }

  return NextResponse.json({
    dueAwardsReviewed: dueAwardCount ?? 0,
    pendingAwardsProcessed: awarded ?? 0,
    expiredReservationsReleased: released ?? 0,
    coinsExpired: expired ?? 0,
  });
}

export async function GET(request: Request) {
  return processGpCoins(request);
}

export async function POST(request: Request) {
  return processGpCoins(request);
}
