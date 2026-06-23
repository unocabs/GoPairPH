import type { createServiceClient } from '@/lib/supabase/server';
import type { FeaturedPaymentMethod, FeaturedPromotionOrder } from '@/types';

export const FEATURED_PAYMENT_PROOF_BUCKET = 'featured-payment-proofs';

export const FEATURED_PROMOTION_PRICES = {
  7: 50,
  30: 150,
} as const;

export type FeaturedPaidDuration = keyof typeof FEATURED_PROMOTION_PRICES;

export function isFeaturedPaidDuration(value: unknown): value is FeaturedPaidDuration {
  return value === 7 || value === 30;
}

export function getFeaturedPromotionPrice(days: FeaturedPaidDuration): number {
  return FEATURED_PROMOTION_PRICES[days];
}

export function labelFeaturedPromotionStatus(order: Pick<FeaturedPromotionOrder, 'source' | 'status' | 'review_status'>): string {
  if (order.source === 'admin') {
    if (order.status === 'active') return 'Admin Pick · No payment';
    return `Admin Pick · ${order.status.replaceAll('_', ' ')}`;
  }
  const base = order.status === 'active'
    ? 'Paid Featured'
    : `Paid · ${order.status.replaceAll('_', ' ')}`;
  return order.review_status === 'pending' ? `${base} · Pending review` : base;
}

export function labelPaymentMethod(method: FeaturedPaymentMethod | null): string {
  if (method === 'gcash') return 'GCash';
  if (method === 'bpi') return 'BPI';
  return 'Not provided';
}

export async function getAdminEmails(service: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const emails = new Set<string>();

  const configured = process.env.ADMIN_NOTIFICATION_EMAILS
    ?.split(',')
    .map(email => email.trim())
    .filter(Boolean) ?? [];
  for (const email of configured) emails.add(email);

  const { data: admins } = await service
    .from('profiles')
    .select('user_id')
    .eq('is_admin', true);

  for (const admin of admins ?? []) {
    const { data } = await service.auth.admin.getUserById(admin.user_id);
    if (data.user?.email) emails.add(data.user.email);
  }

  return Array.from(emails);
}

export function proofPathBelongsToUser(path: string, authUserId: string): boolean {
  return path === authUserId || path.startsWith(`${authUserId}/`);
}
