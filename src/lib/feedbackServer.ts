import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminNotificationEmails } from '@/lib/email/adminNotifications';
import { renderFeedbackEmail } from '@/lib/email/feedback';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/constants';
import type { ProductFeedback } from '@/lib/feedback';

type Service = ReturnType<typeof createServiceClient>;
type FeedbackPayload = Record<string, unknown> & { submission_id: string };
type Delivery = { to: string[]; subject: string; html: string };
type FeedbackJob = ProductFeedback & { profile_id: string | null; email_lease_token: string; email_delivery: Delivery | null };

export async function saveProductFeedback(request: Request, payload: FeedbackPayload, userId: string | null, service: Service) {
  const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateKey = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(userId ? `account:${userId}` : `address:${address}`).digest('hex');
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return service.rpc('submit_product_feedback', { p_payload: payload, p_rate_key: rateKey, p_request_hash: hash });
}

// Save feedback before email. Leased, persisted jobs are retried by the existing notification worker.
export async function processFeedbackEmails(id?: string, service = createServiceClient()) {
  const { data, error } = await service.rpc('claim_feedback_emails', { p_id: id ?? null });
  if (error) throw new Error('Could not claim feedback emails. Check migration 058.');
  const result = { sent: 0, suppressed: 0, retrying: 0 };
  for (const row of (data ?? []) as FeedbackJob[]) {
    try {
      let delivery = row.email_delivery;
      if (!delivery) {
        const admins = await getAdminNotificationEmails(service);
        const to = admins.length ? admins : [process.env.FEEDBACK_TO_EMAIL ?? PUBLIC_SUPPORT_EMAIL];
        const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
        const [listingResult, profileResult] = await Promise.all([
          row.listing_id ? service.from('shoes').select('id,slug,brand,model').eq('id', row.listing_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
          row.profile_id ? service.from('profiles').select('display_name').eq('id', row.profile_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ]);
        if (listingResult.error || profileResult.error) throw new Error('Could not resolve feedback context');
        const listing = listingResult.data;
        const draft: Delivery = {
          to, subject: `Go Pair PH feedback: ${row.category === 'price_estimate' ? 'price estimate' : row.category.replaceAll('_', ' ')}`,
          html: renderFeedbackEmail({ category: row.category, message: row.message, contactEmail: row.contact_email,
            profileName: profileResult.data?.display_name ?? null,
            listingTitle: listing ? `${listing.brand} ${listing.model}` : null,
            listingUrl: listing ? `${site}/listings/${encodeURIComponent(listing.slug ?? listing.id)}` : null, pagePath: row.page_path,
            priceReason: row.price_reason, suggestedPricePhp: row.suggested_price_php, snapshot: row.estimator_snapshot,
            adminUrl: `${site}/admin?tab=feedback`,
          }),
        };
        const snapshot = await service.rpc('snapshot_feedback_email', { p_id: row.id, p_token: row.email_lease_token, p_delivery: draft });
        if (snapshot.error || !snapshot.data) throw new Error('Could not save email delivery');
        delivery = snapshot.data as Delivery;
      }
      const outcome = await sendTransactionalEmail({ ...delivery, category: 'feedback', idempotencyKey: `feedback/${row.id}` });
      if (outcome === 'unconfigured') throw new Error('Email is not configured');
      const finished = await service.rpc('finish_feedback_email', { p_id: row.id, p_token: row.email_lease_token, p_status: outcome });
      if (finished.error || !finished.data) throw new Error('Could not acknowledge email');
      result[outcome]++;
    } catch {
      result.retrying++;
      await service.rpc('finish_feedback_email', { p_id: row.id, p_token: row.email_lease_token, p_status: 'pending' });
    }
  }
  return result;
}
