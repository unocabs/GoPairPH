import { createHmac, timingSafeEqual } from 'node:crypto';

interface UnsubscribePayload {
  userId: string;
  email: string;
}

export function createMarketingUnsubscribeToken(payload: UnsubscribePayload): string {
  const encoded = Buffer.from(JSON.stringify({
    userId: payload.userId,
    email: payload.email.trim().toLowerCase(),
  })).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyMarketingUnsubscribeToken(token: string): UnsubscribePayload | null {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<UnsubscribePayload>;
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return null;
    return { userId: payload.userId, email: payload.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

function sign(value: string): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('EMAIL_UNSUBSCRIBE_SECRET must be configured with at least 32 characters');
  }
  return createHmac('sha256', secret).update(value).digest('base64url');
}
