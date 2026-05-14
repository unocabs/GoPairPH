import { NextResponse } from 'next/server';
import { renderAdminListingViewsReportEmail } from '@/lib/email/listingViewEmails';
import { sendEmail } from '@/lib/email/resend';
import { getListingViewSummaries, getWeeklyReportWindow } from '@/lib/listingViews';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { startDate, endDate, reportKey } = getWeeklyReportWindow();

  const { error: reserveError } = await service
    .from('listing_view_admin_reports')
    .insert({
      report_key: reportKey,
      window_start: startDate,
      window_end: endDate,
    });

  if (reserveError) {
    if (reserveError.code === '23505') {
      return NextResponse.json({ skipped: true, reason: 'Report already sent for this window' });
    }
    console.error('[listing-view-report] reserve failed:', reserveError);
    return NextResponse.json({ error: 'Could not reserve report window' }, { status: 500 });
  }

  const [summaries, adminsRes] = await Promise.all([
    getListingViewSummaries({ startDate, endDate, limit: 100 }),
    service
      .from('profiles')
      .select('user_id, display_name')
      .eq('is_admin', true),
  ]);

  const weeklyListings = summaries
    .map(summary => {
      const weeklyViews = summary.dailyViews.reduce((sum, day) => sum + day.views, 0);
      return { ...summary, weeklyViews };
    })
    .filter(summary => summary.weeklyViews > 0)
    .sort((a, b) => b.weeklyViews - a.weeklyViews);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const totalViews = weeklyListings.reduce((sum, item) => sum + item.weeklyViews, 0);

  const adminProfiles = (adminsRes.data ?? []) as Array<{ user_id: string; display_name: string | null }>;
  const emails = new Set<string>();
  for (const profile of adminProfiles) {
    const { data } = await service.auth.admin.getUserById(profile.user_id);
    if (data.user?.email) emails.add(data.user.email);
  }

  if (emails.size > 0) {
    const html = renderAdminListingViewsReportEmail({
      windowStart: startDate,
      windowEnd: endDate,
      totalViews,
      listings: weeklyListings.map(item => ({
        listingUrl: `${siteUrl}${item.listingPath}`,
        listingName: item.listingName,
        sellerName: item.sellerName,
        shopName: item.shopName,
        totalViews: item.weeklyViews,
        dailyViews: item.dailyViews,
      })),
    });

    await Promise.all(Array.from(emails).map(email => sendEmail({
      to: email,
      subject: `Weekly listing views — Go Pair PH`,
      html,
    })));
  }

  await service
    .from('listing_view_admin_reports')
    .update({
      recipient_count: emails.size,
      total_views: totalViews,
      sent_at: new Date().toISOString(),
    })
    .eq('report_key', reportKey);

  return NextResponse.json({
    sent: emails.size,
    total_views: totalViews,
    report_key: reportKey,
  });
}
