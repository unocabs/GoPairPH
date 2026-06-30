import type { createServiceClient } from '@/lib/supabase/server';
import type { SponsoredPaymentMethod } from '@/types';

export const SPONSORED_PAYMENT_PROOF_BUCKET = 'sponsored-payment-proofs';

export const SPONSORED_PROMOTION_PRICES = {
  7: 30,
  30: 100,
} as const;

export type SponsoredPaidDuration = keyof typeof SPONSORED_PROMOTION_PRICES;

export function isSponsoredPaidDuration(value: unknown): value is SponsoredPaidDuration {
  return value === 7 || value === 30;
}

export function getSponsoredPromotionPrice(days: SponsoredPaidDuration): number {
  return SPONSORED_PROMOTION_PRICES[days];
}

export function labelSponsoredPromotionStatus(status: string, reviewStatus: string): string {
  const base = status === 'active' ? 'Paid Top Pick' : `Paid Top Pick · ${status.replaceAll('_', ' ')}`;
  return reviewStatus === 'pending' ? `${base} · Pending review` : base;
}

export function labelSponsoredPaymentMethod(method: SponsoredPaymentMethod | null): string {
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
