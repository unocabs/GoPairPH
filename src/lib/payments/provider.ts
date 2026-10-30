import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const methodLabels: Record<string, string> = { qrph: 'QR Ph', gcash: 'GCash', card: 'Credit / debit card', paymaya: 'Maya' };

export function paymentConfiguration() {
  const mode = process.env.PAYMONGO_MODE;
  const key = process.env.PAYMONGO_SECRET_KEY ?? '';
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? '';
  const methods = Array.from(new Set((process.env.PAYMONGO_PAYMENT_METHODS || 'qrph').split(',').map(value => value.trim())));
  if (!['test', 'live'].includes(mode ?? '') || !key.startsWith(`sk_${mode}_`) || !secret || methods.some(method => !methodLabels[method])) {
    throw new Error('Payments are not configured.');
  }
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '');
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || (base.protocol !== 'https:' && !(mode === 'test' && base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)))) {
    throw new Error('Invalid payment return URL.');
  }
  return { live: mode === 'live', key, secret, methods, labels: methods.map(method => methodLabels[method]), siteUrl: base.origin };
}

export function paymentsEnabled() {
  return process.env.PAYMENTS_ENABLED === 'true';
}

export function validCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paymongo.com' && !url.port && !url.username && !url.password;
  } catch { return false; }
}

export class ProviderError extends Error {
  status: number;
  constructor(status: number) { super(`Payment provider request failed (${status}).`); this.status = status; }
}

export async function paymongo(path: string, attributes?: Record<string, unknown>, post = false): Promise<unknown> {
  const { key } = paymentConfiguration();
  const response = await fetch(`https://api.paymongo.com${path}`, {
    method: attributes || post ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
    ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
    cache: 'no-store', signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new ProviderError(response.status);
  return response.json();
}

export const checkoutSchema = z.object({ data: z.object({
  id: z.string().regex(/^cs_[A-Za-z0-9]+$/),
  attributes: z.object({
    livemode: z.boolean(), checkout_url: z.string().optional(), status: z.string().optional(), reference_number: z.string().optional(),
    line_items: z.array(z.object({ amount: z.number().int().positive(), quantity: z.number().int().positive(), currency: z.string() })).optional(),
    payments: z.array(z.object({ id: z.string().regex(/^pay_[A-Za-z0-9]+$/), attributes: z.object({
      amount: z.number().int().positive(), currency: z.string(), status: z.string(), livemode: z.boolean(),
      source: z.object({ type: z.string() }).optional(), refunded: z.boolean().optional(), disputed: z.boolean().optional(),
      refunds: z.array(z.unknown()).optional(),
    }) })).optional(),
  }),
}) });

export function verifyPaymongoSignature(raw: string, header: string, secret: string, live: boolean, now = Date.now()): boolean {
  const fields = Object.fromEntries(header.split(',').map(value => value.trim().split('=')));
  const stamp = fields.t;
  const signature = fields[live ? 'li' : 'te'];
  if (!stamp || !/^\d+$/.test(stamp) || !signature || !/^[a-f0-9]{64}$/i.test(signature) || Math.abs(now / 1000 - Number(stamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${stamp}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

const eventAttributes = z.object({ type: z.string(), livemode: z.boolean(), data: z.object({ id: z.string(), attributes: z.record(z.string(), z.unknown()) }) });
export function parsePaymongoEvent(value: unknown) {
  const legacy = z.object({ data: z.object({ id: z.string().min(1).max(160), attributes: eventAttributes }) }).safeParse(value);
  if (legacy.success) return legacy.data.data;
  const hosted = z.object({ event_type: z.literal('send.webhook'), data: eventAttributes }).parse(value);
  return { id: `hosted:${createHash('sha256').update(JSON.stringify(hosted.data)).digest('hex')}`, attributes: hosted.data };
}

export async function readWebhookBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 262_144) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
