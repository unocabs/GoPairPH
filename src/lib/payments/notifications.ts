import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { escapeHtml, paragraph, renderButton, renderEmailShell, renderInfoRows } from '@/lib/email/template';
import { formatListingName, formatPrice } from '@/lib/utils';
import { labelPromotionPaymentMethod, type PromotionPayment } from './types';

export async function sendPromotionPaymentEmail(id: string) {
  const service = createServiceClient();
  const { data } = await service.from('promotion_payments').select('*').eq('id', id).maybeSingle();
  const payment = data as PromotionPayment | null;
  if (!payment?.paid_at || payment.notified_at || !['paid', 'review'].includes(payment.status)) return;
  if (!process.env.RESEND_API_KEY) throw new Error('Payment email is not configured');
  const [{ data: profile }, { data: listing }] = await Promise.all([
    service.from('profiles').select('user_id').eq('id', payment.seller_id).single(),
    service.from('shoes').select('brand,model').eq('id', payment.listing_id).single(),
  ]);
  if (!profile) throw new Error('Payment seller missing');
  const { data: { user }, error } = await service.auth.admin.getUserById(profile.user_id);
  if (error || !user?.email) throw new Error('Payment email unavailable');
  const name = listing ? formatListingName(listing.brand, listing.model) : 'your running shoes';
  const label = payment.placement === 'featured' ? 'Featured' : 'Top Pick';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const url = `${siteUrl}/promotions/payments?order=${payment.id}`;
  await sendTransactionalEmail({
    category: payment.placement === 'featured' ? 'featured_promotion' : 'sponsored_promotion',
    to: user.email, subject: payment.status === 'review' ? `${label} payment received: review needed` : `${label} payment confirmed: ${name}`,
    idempotencyKey: `promotion-payment/${payment.id}`,
    html: renderEmailShell({ title: payment.status === 'review' ? 'Payment received, review needed' : 'Your promotion payment is confirmed', eyebrow: 'Go Pair PH', children: `
      ${paragraph(`We recorded your ${label} payment for <strong>${escapeHtml(name)}</strong>.`)}
      ${paragraph(payment.status === 'review' ? 'Your placement needs review. Please contact support with the reference below before paying again.' : payment.placement === 'featured' ? 'Your shoes are Featured now or waiting in the paid Featured queue. See your placement status below.' : 'Your shoes are now a Top Pick in Browse. Eligible listings with photos also rotate through homepage Top Picks, with up to four shown at a time.')}
      ${renderInfoRows([{ label: 'Duration', value: `${payment.duration_days} days` }, { label: 'Amount paid', value: formatPrice(payment.amount_minor / 100) }, { label: 'Payment method', value: labelPromotionPaymentMethod(payment) }, { label: 'GP Coins', value: String(payment.coins_used) }, { label: 'Reference', value: payment.id }])}
      <p style="margin-top:22px">${renderButton(url, 'View payment and placement')}</p>
    ` }),
  });
  const { error: updateError } = await service.from('promotion_payments').update({ notified_at: new Date().toISOString() }).eq('id', payment.id).is('notified_at', null);
  if (updateError) throw new Error('Could not mark confirmation sent');
}
