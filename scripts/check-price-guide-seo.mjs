import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
const path = process.argv[2] ?? '.next-build-check/server/app/price-guide.html',
  html = readFileSync(path, 'utf8');
const plain = (value) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
const attrs = (tag) =>
  Object.fromEntries(
    Array.from(tag.matchAll(/([\w:-]+)="([^"]*)"/g), (match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  );
const metas = Array.from(html.matchAll(/<meta\b[^>]*>/g), (match) =>
  attrs(match[0]),
);
const meta = (name) =>
  metas.find((row) => row.name === name || row.property === name)?.content;
const canonicals = Array.from(html.matchAll(/<link\b[^>]*>/g), (match) =>
  attrs(match[0]),
).filter((row) => row.rel === 'canonical');
assert.equal(canonicals.length, 1);
assert.equal(new URL(canonicals[0].href).pathname, '/price-guide');
assert.match(
  plain(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
  /Running Shoe Resale Price Calculator Philippines/,
);
assert.ok(
  meta('description')?.length >= 80 && meta('description').length <= 165,
  'Descriptive search snippet within intended length.',
);
assert.ok(!/noindex|nofollow/i.test(meta('robots') ?? ''));
const headings = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g));
assert.equal(headings.length, 1);
assert.match(plain(headings[0][1]), /fair asking price.*running shoes/i);
const jsonld = Array.from(
  html.matchAll(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  ),
  (match) => JSON.parse(match[1]),
);
const faq = jsonld.find((row) => row['@type'] === 'FAQPage'),
  breadcrumbs = jsonld.find((row) => row['@type'] === 'BreadcrumbList');
assert.ok(
  faq?.mainEntity.length >= 4 && breadcrumbs?.itemListElement.length === 2,
);
// Compare structured answers to actual prerendered <details> content, not the JS payload.
const details = Array.from(
  html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g),
  (match) => plain(match[0]),
).join(' ');
for (const row of faq.mainEntity) {
  assert.ok(
    details.includes(row.name),
    `FAQ question missing from public HTML: ${row.name}`,
  );
  assert.ok(
    details.includes(row.acceptedAnswer.text),
    `FAQ answer missing from public HTML: ${row.name}`,
  );
}
assert.match(html, /How to price used running shoes fairly/);
assert.match(html, /Estimator starting ranges by condition/);
for (const href of [
  '/browse',
  '/help/how-to-sell',
  '/official-running-shoe-brand-links-ph',
  '/where-to-sell-used-running-shoes-philippines',
])
  assert.ok(
    html.includes(`href="${href}"`),
    `Missing crawlable internal link ${href}`,
  );
assert.ok(
  meta('og:image')?.endsWith(
    'running-shoe-price-estimator-unbranded-1200.webp',
  ),
);
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '800');
const hero = Array.from(html.matchAll(/<img\b[^>]*>/g), (match) =>
  attrs(match[0]),
).find((row) => row.src?.includes('running-shoe-price-estimator-unbranded'));
assert.ok(hero?.alt && hero.width === '1200' && hero.height === '800');
assert.match(html, /running-shoe-price-estimator-unbranded-480\.webp 480w/);
assert.ok(
  !html.includes('unbranded-hero-v1.png'),
  'The source PNG must not be served in the page.',
);
assert.ok(!html.includes('Free beta'), 'Public beta banner must be absent.');
for (const size of [480, 768, 1200])
  assert.ok(
    statSync(
      `public/guides/running-shoe-price-estimator-unbranded-${size}.webp`,
    ).size < 110000,
  );
console.log(
  'Price-guide prerendered SEO checks passed: canonical, title/description, robots, one H1, public guide/FAQ parity, breadcrumbs, crawlable links, social image, responsive asset sizes and no beta banner.',
);
