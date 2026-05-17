import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getManilaDateString } from '@/lib/listingViews';
import { renderListingViewMilestoneEmail, renderListingViewLifetimeMilestoneEmail } from '@/lib/email/listingViewEmails';
import { sendEmail } from '@/lib/email/resend';
import { getAbsoluteListingUrl } from '@/lib/utils';

export const runtime = 'nodejs';

const bodySchema = z.object({
  listing_id: z.string().uuid(),
  visitor_id: z.string().trim().min(12).max(128),
});

interface RecordViewResult {
  counted: boolean;
  total_views: number;
  /** Daily-tier crossed today; 0 when no tier crossed. */
  new_milestone: number;
  /** One-time lifetime milestone crossed; 0 when not applicable. */
  lifetime_milestone: number;
}

function hashVisitorId(visitorId: string, listingId: string): string {
  const secret = process.env.VIEW_TRACKING_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? 'gopairph-view-tracking';
  return createHash('sha256')
    .update(`${secret}:${listingId}:${visitorId}`)
    .digest('hex');
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ counted: false }, { status: 200 });
  }

  const service = createServiceClient();
  const supabase = createClient();

  const { data: listing } = await service
    .from('shoes')
    .select('id, slug, brand, model, seller_id, status, profiles(id, user_id, display_name)')
    .eq('id', parsed.listing_id)
    .maybeSingle();

  if (!listing || listing.status !== 'active') {
    return NextResponse.json({ counted: false }, { status: 200 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.is_admin || profile?.id === listing.seller_id) {
      return NextResponse.json({ counted: false }, { status: 200 });
    }
  }

  const visitorHash = hashVisitorId(parsed.visitor_id, parsed.listing_id);
  const { data: record, error } = await service
    .rpc('record_listing_view', {
      p_listing_id: parsed.listing_id,
      p_view_date: getManilaDateString(),
      p_visitor_hash: visitorHash,
    })
    .single();

  if (error || !record) {
    console.error('[listing-views] record failed:', error);
    return NextResponse.json({ counted: false }, { status: 200 });
  }

  const result = record as RecordViewResult;
  if (result.new_milestone > 0 || result.lifetime_milestone > 0) {
    try {
      const sellerProfile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
      const sellerUserId = sellerProfile?.user_id;
      if (sellerUserId) {
        const { data: sellerAuth } = await service.auth.admin.getUserById(sellerUserId);
        const sellerEmail = sellerAuth?.user?.email;
        if (sellerEmail) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
          const listingUrl = getAbsoluteListingUrl(siteUrl.replace(/\/$/, ''), listing);
          const sellerName = sellerProfile?.display_name ?? 'there';

          if (result.new_milestone > 0) {
            await sendEmail({
              to: sellerEmail,
              subject: 'Your running shoes are getting noticed on Go Pair PH',
              html: renderListingViewMilestoneEmail({
                sellerName,
                brand: listing.brand,
                model: listing.model,
                milestone: result.new_milestone,
                listingUrl,
              }),
            });
          }

          // Lifetime milestone is one-time (currently 20). Sent separately so the
          // copy can lean into the cumulative achievement, not today's activity.
          if (result.lifetime_milestone > 0) {
            await sendEmail({
              to: sellerEmail,
              subject: `${result.lifetime_milestone} runners have viewed your pair — Go Pair PH`,
              html: renderListingViewLifetimeMilestoneEmail({
                sellerName,
                brand: listing.brand,
                model: listing.model,
                milestone: result.lifetime_milestone,
                listingUrl,
              }),
            });
          }
        }
      }
    } catch (emailError) {
      console.error('[listing-views] milestone email failed:', emailError);
    }
  }

  return NextResponse.json({ counted: result.counted }, { status: 200 });
}
