# Price guide design refresh — November 1, 2026

Implemented locally; not deployed. No database migration, payment activation, source-collection permission or provider configuration changed.

## Experience

The focused estimator card now has five steps: shoe details, condition, usage, extras and review. Brand uses the shared site dropdown, with a required custom brand name under Other. Brand changes clear the previous model. Canonical casing/On aliases restore consistently; model suggestions stay scoped to the selected brand. Uncatalogued shoes retain the existing honest SRP fallback.

Drafts preserve partial input, exact mileage, custom brand selection, extras, asking price and the current step. Draft persistence begins after local hydration rather than waiting for a catalogue/account request. The sign-in action explicitly saves the draft before leaving. History, comparison, export, server estimates and immutable feedback remain on the existing v2 contract. No pricing coefficients or paid-access rules changed.

The prominent public Free beta banner is removed. Pricing limitations remain beside results and in the guide. Admin's internal free-beta status and existing billing gates remain accurate. The neutral presentation does not enable checkout.

## Image and mobile behavior

The original generated asset is preserved. The deployed hero references pre-encoded WebP derivatives only, because this project sets global images.unoptimized=true:

| Width | Bytes |
| --- | ---: |
| 480 px | 18,896 |
| 768 px | 44,740 |
| 1,200 px | 97,874 |

A native picture source supplies responsive candidates; next/image supplies the image and dimensions. The desktop hero uses a reserved 2:1 frame and a CSS crop/edge blend. Eager loading/high fetch priority helps the visible desktop hero load promptly without requiring runtime image optimization. The decorative photo is omitted visually on narrow screens to keep the first form accessible. Browsers may still request a small candidate; no runtime download of the 2.3 MB source PNG is referenced in the page.

The guided form uses native controls, large touch targets, keyboard focus on step changes, and reduced-motion-aware step scrolling. No new runtime dependency was added. Browser QA used 320, 375 and 430 px iframe widths and the desktop preview. These are responsive-layout checks, not real-device network/Core Web Vitals measurements.

## SEO safeguards and improvements

- Kept /price-guide, its descriptive page title, canonical path, sitemap entry and index/follow settings.
- Kept the guide, condition table and FAQ answers in the prerendered public HTML, independent of account access or calculator interaction.
- Kept one descriptive H1 and a logical heading hierarchy; the visible eyebrow retains the running-shoe resale-calculator/Philippines context.
- Refined the search description; added source/discount/box-and-receipt FAQ answers, consistent with actual calculator limitations.
- FAQ JSON-LD uses the same data as the rendered accordions. Added a visible breadcrumb and matching BreadcrumbList JSON-LD. No rating, Product offer, guaranteed price or rich-result eligibility claim was added.
- Added crawlable links to official-brand-store guidance and the Philippines selling guide, alongside Browse and How to sell.
- Updated Open Graph/Twitter to the new image with descriptive alt text and actual image dimensions. Existing image URLs remain available.

These choices follow [Google's rendering guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and [image guidance](https://developers.google.com/search/docs/appearance/google-images). The image component was checked against the project's Next.js 14 documentation. Technical checks cannot guarantee rankings; live indexing, Search Console changes and field performance need post-deployment observation.

## Verification

```sh
npm test
npm run lint
npm run build:check
npm run check:price-guide:seo
```

The SEO script checks the actual built HTML for canonical/title/description/robots, one H1, public guide content, every FAQ question/answer matching its structured data, breadcrumbs, internal links, social image dimensions, responsive file sizes and absence of the public beta banner.

170 automated tests pass, including new brand normalization, custom-brand, step validation, mileage boundary and draft restoration cases. Browser fixture checks covered the full five-step Evo SL flow (unchanged ₱4,500 starting price), Back navigation, model clearing on brand change, custom brand entry, reload persistence and the isolated sign-in handoff/return preserving the review. The fixture used in-memory estimates and blocked feedback/payment writes. No live billing or admin email was tested. Full production OAuth is outside this isolated fixture check.
