import type { GpCoinTransaction, GpCoinTransactionType } from '@/types';

export const GP_COINS_PER_PESO = 2;

export function coinsToPesoDiscount(coins: number): number {
  return Math.floor(Math.max(0, coins) / GP_COINS_PER_PESO);
}

export function maxRedeemableCoins(balance: number, pricePhp: number): number {
  const capped = Math.min(Math.max(0, balance), Math.max(0, pricePhp) * GP_COINS_PER_PESO);
  return capped - (capped % GP_COINS_PER_PESO);
}

export function formatGpCoins(coins: number): string {
  return `${coins.toLocaleString('en-PH')} GP ${Math.abs(coins) === 1 ? 'Coin' : 'Coins'}`;
}

export function getGpCoinTransactionLabel(transaction: Pick<GpCoinTransaction, 'transaction_type' | 'metadata'>): string {
  const action = typeof transaction.metadata?.action === 'string' ? transaction.metadata.action : null;
  if (action === 'listing_publish') return 'Published a listing';
  if (action === 'listing_renewal') return 'Renewed a listing';
  if (action === 'caption_copy') return 'Copied FB caption';
  if (action === 'image_download') return 'Downloaded share image';
  if (action === 'fb_group_open') return 'Opened FB group';

  const labels: Record<GpCoinTransactionType, string> = {
    award: 'GP Coin reward',
    hold: 'Reserved for Featured',
    spend: 'Spent on Featured',
    release: 'Released from checkout',
    refund: 'GP Coin refund',
    expiration: 'Expired GP Coins',
    reversal: 'Reward reversed',
    admin_adjustment: 'Admin adjustment',
  };
  return labels[transaction.transaction_type];
}
