import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAdminNotificationEmails, renderAdminActionEmail } from '@/lib/email/adminNotifications';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';

export const runtime = 'nodejs';

const reportSchema = z.object({
  reason: z.enum([
    'misleading_photos',
    'suspicious_or_scam',
    'already_sold',
    'wrong_price_or_details',
    'seller_unreachable',
    'duplicate_or_spam',
    'other',
  ]),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: { listingId: string } }) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid report' }, { status: 400 });
  }

  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  let reporterId: string | null = null;
  let reporterName: string | null = null;
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    reporterId = profile?.id ?? null;
    reporterName = profile?.display_name ?? null;
  }

  const { data: listing } = await service
    .from('shoes')
    .select('id, slug, brand, model')
    .eq('id', params.listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const { data: report, error } = await service.from('listing_reports').insert({
    listing_id: params.listingId,
    reason: parsed.data.reason,
    note: parsed.data.note ? parsed.data.note : null,
    reporter_id: reporterId,
  }).select('id').single();

  if (error || !report) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    const admins = await getAdminNotificationEmails(service);
    if (admins.length > 0) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      const listingName = formatListingName(listing.brand, listing.model);
      await sendTransactionalEmail({
        category: 'admin_notification',
        to: admins,
        subject: `Listing reported: ${listingName}`,
        html: renderAdminActionEmail({
          title: 'New listing report',
          intro: 'A marketplace listing was reported and needs admin review.',
          rows: [
            { label: 'Listing', value: listingName },
            { label: 'Reason', value: parsed.data.reason.replaceAll('_', ' ') },
            { label: 'Reporter', value: reporterName ?? (user?.email || 'Anonymous visitor') },
            { label: 'Listing URL', value: getAbsoluteListingUrl(siteUrl, listing) },
          ],
          note: parsed.data.note,
          adminUrl: `${siteUrl}/admin?tab=listingReports`,
          buttonLabel: 'Review listing report',
        }),
        tags: { notification: 'listing_report' },
      });
    }
  } catch (emailError) {
    console.error('[listing-reports] admin email failed', emailError);
  }

  return NextResponse.json({ id: report.id }, { status: 201 });
}
