import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LISTING_RENEWAL_DAY_MS = 24 * 60 * 60 * 1000;
export const LISTING_RENEWAL_FIRST_REMINDER_DAYS = 21;
export const LISTING_RENEWAL_MIN_DAYS_SINCE_UPDATE = 14;
export const LISTING_RENEWAL_REPEAT_REMINDER_DAYS = 30;

interface ListingRenewalTokenPayload {
  listingId: string;
  sellerId: string;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.LISTING_RENEWAL_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('LISTING_RENEWAL_SECRET or CRON_SECRET is required for listing renewal links');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createListingRenewalToken({
  listingId,
  sellerId,
  expiresAt = Date.now() + TOKEN_TTL_MS,
}: Omit<ListingRenewalTokenPayload, 'expiresAt'> & { expiresAt?: number }): string {
  const payload = Buffer.from(JSON.stringify({ listingId, sellerId, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyListingRenewalToken(token: string | null): ListingRenewalTokenPayload | null {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ListingRenewalTokenPayload;
    if (!parsed.listingId || !parsed.sellerId || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isListingRenewalCandidate(listing: {
  created_at: string;
  updated_at: string;
  renewal_reminder_sent_at?: string | null;
}, now = Date.now()): boolean {
  const firstReminderCutoff = now - LISTING_RENEWAL_FIRST_REMINDER_DAYS * LISTING_RENEWAL_DAY_MS;
  const updatedCutoff = now - LISTING_RENEWAL_MIN_DAYS_SINCE_UPDATE * LISTING_RENEWAL_DAY_MS;
  const repeatReminderCutoff = now - LISTING_RENEWAL_REPEAT_REMINDER_DAYS * LISTING_RENEWAL_DAY_MS;
  const createdAt = new Date(listing.created_at).getTime();
  const updatedAt = new Date(listing.updated_at).getTime();
  const reminderSentAt = listing.renewal_reminder_sent_at
    ? new Date(listing.renewal_reminder_sent_at).getTime()
    : 0;

  return createdAt <= firstReminderCutoff &&
    updatedAt <= updatedCutoff &&
    (reminderSentAt === 0 || reminderSentAt <= repeatReminderCutoff);
}
