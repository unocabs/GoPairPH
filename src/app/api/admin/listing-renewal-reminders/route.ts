import { NextResponse } from 'next/server';
import { renderListingRenewalEmail } from '@/lib/email/listingRenewal';
import {
  LISTING_RENEWAL_DAY_MS,
  LISTING_RENEWAL_FIRST_REMINDER_DAYS,
  LISTING_RENEWAL_MIN_DAYS_SINCE_UPDATE,
  LISTING_RENEWAL_REPEAT_REMINDER_DAYS,
  createListingRenewalToken,
  isListingRenewalCandidate,
} from '@/lib/listingRenewal';
import { createServiceClient } from '@/lib/supabase/server';
import { getAbsoluteListingUrl } from '@/lib/utils';

export const runtime = 'nodejs';

const BATCH_LIMIT = 100;

type RenewalListingRow = {
  id: string;
  slug: string | null;
  seller_id: string;
  brand: string;
  model: string;
  status: string;
  has_stock: boolean;
  created_at: string;
  updated_at: string;
  renewal_reminder_sent_at: string | null;
  profiles?: { user_id: string; display_name: string | null } | Array<{ user_id: string; display_name: string | null }> | null;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function getSellerProfile(listing: RenewalListingRow): { user_id: string; display_name: string | null } | null {
  if (Array.isArray(listing.profiles)) return listing.profiles[0] ?? null;
  return listing.profiles ?? null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const now = Date.now();
  const createdCutoff = new Date(now - LISTING_RENEWAL_FIRST_REMINDER_DAYS * LISTING_RENEWAL_DAY_MS).toISOString();
  const updatedCutoff = new Date(now - LISTING_RENEWAL_MIN_DAYS_SINCE_UPDATE * LISTING_RENEWAL_DAY_MS).toISOString();
  const reminderCutoff = new Date(now - LISTING_RENEWAL_REPEAT_REMINDER_DAYS * LISTING_RENEWAL_DAY_MS).toISOString();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');

  const { data, error } = await service
    .from('shoes')
    .select('id, slug, seller_id, brand, model, status, has_stock, created_at, updated_at, renewal_reminder_sent_at, profiles!shoes_seller_id_fkey(user_id, display_name)')
    .eq('status', 'active')
    .eq('has_stock', true)
    .lte('created_at', createdCutoff)
    .lte('updated_at', updatedCutoff)
    .or(`renewal_reminder_sent_at.is.null,renewal_reminder_sent_at.lte.${reminderCutoff}`)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('[listing-renewal-reminders] query failed', error);
    return NextResponse.json({ error: 'Could not load renewal candidates' }, { status: 500 });
  }

  const candidates = ((data as unknown as RenewalListingRow[] | null) ?? [])
    .filter(listing => isListingRenewalCandidate(listing, now));

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ listingId: string; error: string }> = [];

  for (const listing of candidates) {
    const sellerProfile = getSellerProfile(listing);
    try {
      const token = createListingRenewalToken({
        listingId: listing.id,
        sellerId: listing.seller_id,
      });
      const listingUrl = getAbsoluteListingUrl(siteUrl, listing);
      const renewUrl = `${siteUrl}/api/listings/${listing.id}/renew?token=${encodeURIComponent(token)}`;
      const updatePath = `/listings/${listing.id}/edit?renew=1`;
      const updateAndRenewUrl = `${siteUrl}/auth/sign-in?next=${encodeURIComponent(updatePath)}`;

      const { data: queued, error: queueError } = await service.rpc('queue_renewal_notification', {
        p_listing: listing.id, p_previous: listing.renewal_reminder_sent_at,
        p_payload: { listing_id: listing.id, updated_at: listing.updated_at, category: 'listing_renewal',
        subject: `Renew your ${listing.brand} ${listing.model} listing`,
        html: renderListingRenewalEmail({
          sellerName: sellerProfile?.display_name || 'there',
          brand: listing.brand,
          model: listing.model,
          listingUrl,
          renewUrl,
          updateAndRenewUrl,
        }),
        },
      });
      if (queueError) throw queueError;
      if (!queued) { skipped += 1; continue; }

      sent += 1;
    } catch (err) {
      failures.push({
        listingId: listing.id,
        error: (err as Error).message ?? 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    queued: sent,
    skipped,
    failed: failures.length,
    failures,
    checked: candidates.length,
  });
}
