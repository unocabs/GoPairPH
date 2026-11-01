import { createServiceClient } from '@/lib/supabase/server';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { renderButton, renderEmailShell, paragraph } from '@/lib/email/template';
import { renderBuybackLifecycleEmail, renderBuybackShippingReminderEmail } from '@/lib/email/buybackOffer';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';

export interface NotificationJob {
  id: string;
  kind: 'chat' | 'renewal' | 'buyback_expired' | 'buyback_shipping' | 'saved_search';
  recipient_id: string;
  lease_token: string;
  payload: { html?: string; subject?: string; listing_id?: string; updated_at?: string; offer_id?: string };
}

export async function deliverNotification(job: NotificationJob, service = createServiceClient()): Promise<'sent' | 'skipped' | 'deferred'> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  let html = job.payload.html;
  let subject = job.payload.subject;
  let category: 'chat_message' | 'listing_renewal' | 'buyback_offer' | 'saved_search' = 'saved_search';
  if (job.kind === 'chat') {
    const { data: threads, error } = await service.rpc('prepare_chat_notification', { p_job: job.id, p_lease: job.lease_token });
    if (error) throw new Error('Could not prepare unread alert');
    if (threads === null) return 'deferred';
    if (!Array.isArray(threads) || threads.length === 0) return 'skipped';
    category = 'chat_message';
    subject = 'You have new messages on Go Pair PH';
    // Stable retry content, with no private chat text exposed in email previews.
    html = renderEmailShell({ title: 'You have unread messages', eyebrow: 'Go Pair PH', children:
      paragraph('Someone has sent you a message about shoes on Go Pair PH. Open your inbox to reply or check your offer.')
      + renderButton(`${siteUrl}/messages`, 'Open your messages')
      + paragraph('You will receive one alert while a conversation stays unread. You can mute alerts from its conversation menu.'),
    });
  } else if (job.kind === 'renewal') {
    category = 'listing_renewal';
    const { data: listing, error } = await service.from('shoes').select('status,has_stock,updated_at').eq('id', job.payload.listing_id).maybeSingle();
    if (error) throw new Error('Could not check reminder eligibility');
    if (!listing || listing.status !== 'active' || !listing.has_stock || Date.parse(listing.updated_at) !== Date.parse(job.payload.updated_at ?? '')) return 'skipped';
  } else if (job.kind.startsWith('buyback_')) {
    category = 'buyback_offer';
    const { data: offer, error } = await service.from('buyback_offers')
      .select('id,status,proposed_ship_date,quoted_price_php,seller:profiles!seller_id(display_name),listing:shoes!listing_id(id,slug,brand,model)').eq('id', job.payload.offer_id).maybeSingle();
    if (error) throw new Error('Could not check buyback notification');
    if (!offer || (job.kind === 'buyback_expired' ? offer.status !== 'expired' : offer.status !== 'accepted')) return 'skipped';
    const seller = (Array.isArray(offer.seller) ? offer.seller[0] : offer.seller) as unknown as { display_name: string };
    const listing = (Array.isArray(offer.listing) ? offer.listing[0] : offer.listing) as unknown as { id: string; slug: string; brand: string; model: string };
    if (!seller || !listing) return 'skipped';
    const title = formatListingName(listing.brand, listing.model);
    const args = { sellerName: seller.display_name, listingTitle: title, quoteLabel: formatPrice(offer.quoted_price_php), listingUrl: `${siteUrl}${getListingPath(listing)}` };
    subject = job.kind === 'buyback_expired' ? `Buyback offer expired — ${title}` : `J&T shipping reminder — ${title}`;
    html = job.kind === 'buyback_expired' ? renderBuybackLifecycleEmail({ ...args, status: 'expired' }) : renderBuybackShippingReminderEmail({ ...args, shipDate: offer.proposed_ship_date });
  }
  if (!html || !subject) throw new Error('Notification content is missing');
  const { data: profile, error: profileError } = await service.from('profiles').select('user_id').eq('id', job.recipient_id).maybeSingle();
  if (profileError) throw new Error('Could not resolve recipient');
  if (!profile) return 'skipped';
  const { data: auth, error: authError } = await service.auth.admin.getUserById(profile.user_id);
  if (authError) throw new Error('Could not resolve recipient email');
  if (!auth.user?.email) return 'skipped';
  const { data: delivery, error: snapshotError } = await service.rpc('notification_delivery_snapshot', {
    p_job: job.id, p_lease: job.lease_token, p_delivery: { category, to: auth.user.email, subject, html },
  });
  if (snapshotError || !delivery) throw new Error('Could not save notification delivery');
  const outcome = await sendTransactionalEmail({ ...delivery, idempotencyKey: `notification/${job.id}` });
  if (outcome === 'unconfigured') throw new Error('Transactional email is not configured');
  return outcome === 'suppressed' ? 'skipped' : 'sent';
}

export async function processNotifications(service = createServiceClient()) {
  const { data, error } = await service.rpc('claim_notification_jobs', { p_limit: 5 });
  if (error) throw new Error('Could not claim notifications');
  const started = Date.now();
  const result = { sent: 0, skipped: 0, retrying: 0, deferred: 0 };
  for (const job of (data ?? []) as NotificationJob[]) {
    if (Date.now() - started > 40_000) break;
    try {
      const outcome = await deliverNotification(job, service);
      if (outcome === 'deferred') { result.deferred++; continue; }
      const { error: finishError } = await service.rpc('finish_notification_job', { p_job: job.id, p_lease: job.lease_token, p_status: outcome });
      if (finishError) throw new Error('Could not acknowledge notification');
      result[outcome]++;
    } catch {
      result.retrying++;
      const { error: retryError } = await service.rpc('finish_notification_job', {
        p_job: job.id, p_lease: job.lease_token, p_status: 'pending', p_error: 'Delivery failed; retry scheduled. Check provider delivery logs.',
      });
      if (retryError) console.error('[notifications] lease acknowledgement failed', job.id);
    }
  }
  return result;
}
