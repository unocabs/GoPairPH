// Strict, bounded structured-data parser. No JavaScript execution, search scraping, or guessed prices.
export const RETAIL_HOSTS = [
  'www.adidas.com.ph',
  'www.asics.com',
  'sportscentral.ph',
];
export function permittedRetailUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      RETAIL_HOSTS.includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export interface RetailSource {
  id: string;
  model_id: string;
  source_name: string;
  url: string;
  sku: string;
  variant: string;
  lease_until: string;
  last_attempt_at: string;
}
function norm(value: unknown) {
  return typeof value === 'string'
    ? value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    : '';
}
export function extractRetailOffer(
  html: string,
  source: Pick<RetailSource, 'sku' | 'url'>,
) {
  const products: Record<string, unknown>[] = [];
  function visit(value: unknown, depth = 0) {
    if (depth > 12 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.slice(0, 100).forEach((item) => visit(item, depth + 1));
      return;
    }
    const row = value as Record<string, unknown>;
    const types = Array.isArray(row['@type']) ? row['@type'] : [row['@type']];
    if (types.includes('Product')) products.push(row);
    if (row['@graph']) visit(row['@graph'], depth + 1);
  }
  for (const match of Array.from(
    html.matchAll(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi,
    ),
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {}
  }
  const offers: {
    price: number;
    availability: 'available' | 'unknown' | 'out_of_stock';
    validUntil: string | null;
  }[] = [];
  for (const product of products) {
    if (
      ![product.sku, product.mpn, product.productID].some(
        (id) => norm(id) === norm(source.sku),
      )
    )
      continue;
    for (const raw of Array.isArray(product.offers)
      ? product.offers
      : [product.offers]) {
      if (!raw || typeof raw !== 'object') continue;
      const offer = raw as Record<string, unknown>;
      if (offer.priceCurrency !== 'PHP' || offer['@type'] === 'AggregateOffer')
        continue;
      const price = Number(offer.price);
      if (!Number.isFinite(price) || price <= 0 || price > 1000000) continue;
      if (offer.url) {
        try {
          if (
            new URL(String(offer.url)).hostname !== new URL(source.url).hostname
          )
            continue;
        } catch {
          continue;
        }
      }
      const availability = String(offer.availability ?? '');
      const date =
        typeof offer.priceValidUntil === 'string'
          ? offer.priceValidUntil
          : null;
      const validUntil =
        date && Number.isFinite(Date.parse(date))
          ? new Date(
              date.length === 10
                ? Date.parse(`${date}T00:00:00+08:00`) + 86400000
                : Date.parse(date),
            ).toISOString()
          : null;
      offers.push({
        price,
        availability: availability.endsWith('/OutOfStock')
          ? 'out_of_stock'
          : availability.endsWith('/InStock')
            ? 'available'
            : 'unknown',
        validUntil,
      });
    }
  }
  if (!offers.length)
    throw Error(
      'No exact-SKU PHP Product/Offer found. Add a reviewed manual reference.',
    );
  if (
    new Set(
      offers.map((row) => `${row.price}:${row.availability}:${row.validUntil}`),
    ).size !== 1
  )
    throw Error('Ambiguous variant offers. Review prices manually.');
  return offers[0];
}
export async function fetchRetailOffer(source: RetailSource) {
  if (!permittedRetailUrl(source.url))
    throw Error('Source host is not allowed.');
  const response = await fetch(source.url, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent':
        'GoPairPH-RetailReference/1.0 (+https://gopairph.com/contact)',
      Accept: 'text/html',
    },
  });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('text/html')
  )
    throw Error(`Retail source unavailable (${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw Error('Empty source response.');
  let size = 0,
    html = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 512000) throw Error('Retail page exceeds the import limit.');
      html += decoder.decode(chunk.value, { stream: true });
    }
    html += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  return extractRetailOffer(html, source);
}
