# Price estimator design refresh plan

Prepared November 1, 2026. Implemented locally after approval: brand dropdown with Other, five guided steps, compact hero with the unbranded photograph, neutral public wording and SEO improvements. Access rules, payment configuration and database settings remain unchanged. See [implementation QA](price-guide-design-refresh-qa.md). The design below records the approved direction; the image prompt remains preserved.

## What regressed

The previous estimator used a focused max-width card, a three-field introduction with a brand dropdown, five guided steps, a visible progress cue, and stronger visual hierarchy. The latest implementation replaced that presentation with a wider flat form while adding server estimates and account features. Brand became a text field. The hero kept its text-only layout, leaving the large unused right side shown in the screenshot. The prominent beta notice adds visual weight before the main action.

Restore the presentation while retaining the v2 engine, immutable feedback, history, comparisons, account entitlements and provider verification. Confidence, dates and reference limitations should remain honest.

## Proposed changes

1. **Brand dropdown.** Reuse BRANDS from src/lib/constants.ts and the existing site Select component: Adidas, Asics, Brooks, Hoka, Mizuno, New Balance, Nike, On Running, Puma, Salomon, Saucony, Under Armour, Other. Add a custom brand field when Other is selected. Normalize saved/custom brand names when restoring drafts. Keep exact model text and brand-specific suggestions; prevent a stale canonical model from carrying over to a different brand. A listed brand does not imply full retail-reference coverage.
2. **Guided estimator.** Restore the familiar focused card and five steps: shoe identity/SRP; condition; mileage/age; box/receipt/flaws; optional asking price and review. Use clear Back/Continue actions, a small progress indicator, and a single final estimate action. Preserve anonymous drafts, entered values during navigation and checkout, and server validation. Sign-in remains before a complete account result is saved. Keep result feedback, history, comparison and export. Do not restore unsupported sale-probability scores.
3. **Hero.** On desktop, use approximately 55% text and 45% photograph, aligned vertically, with restrained teal accents and a subtle navy edge blend. Suggested headline: “Find a fair asking price for your running shoes.” Suggested supporting copy: “Get a suggested resale range based on your shoe details and available retail references.” Preserve the descriptive SEO metadata. Use the generated photograph on the right; no added text, badges or logos baked into it.
4. **Mobile and performance.** Keep 16px page gutters, 44px minimum touch targets and readable input text. Use a compact mobile photo crop or omit the decoration when it pushes the first action too far down. Reserve image dimensions to avoid layout shift; provide responsive image sizes and an optimized web format during implementation. Avoid heavy animation or new UI dependencies. Verify 320, 375, 430px and desktop layouts, keyboard navigation, drafts through sign-in and required-feedback errors.
5. **Beta wording.** Replace the large “Free beta” banner with a neutral “Shoe price guide” introduction. Keep concise source/uncertainty explanations beside each result and coverage before purchase. Decouple the public label from premiumEnabled so visual polish can change independently of charging.

## Removing the beta label versus starting paid access

The current banner is rendered in src/components/pricing/PriceGuideForm.tsx when overview.access.premiumEnabled is false. Change that presentation branch to neutral copy to remove the public beta banner while keeping the estimator available without payment.

Actual paid activation is separate. estimator_settings.premium_enabled is guarded by quality_approved, at least 50 independent outcomes and a retained benchmark report. Checkout also needs PAYMENTS_ENABLED=true, ESTIMATOR_CHECKOUT_ENABLED=true, matching database/provider mode and the configured estimator webhook. Apply the existing rollout process after real accuracy and merchant testing. Hiding the label does not satisfy those launch requirements. See price-estimator-implementation.md.

If SQL is changed during later implementation, this project does not auto-apply migrations; provide the exact migration or SQL to run manually in Supabase SQL Editor. This design plan does not require a migration.

## Image candidate

Asset: public/guides/running-shoe-price-estimator-unbranded-hero-v1.png

Created using the built-in image_gen tool. It is an AI-generated photorealistic candidate, not an actual photograph of a listed shoe. Intended treatment: natural materials, real contact shadow, modest wear, unbranded construction, no text or artificial neon effects. Inspect the final cropped version at desktop and mobile sizes before integrating it. The original generated asset is preserved; no existing asset was replaced.

## Implementation order and acceptance

1. Restore the dropdown and focused step flow on the existing v2 data contract.
2. Rework the hero and integrate an optimized version of the image.
3. Remove the prominent beta branding through presentation-only changes.
4. Verify required fields, Other-brand behavior, model matching, persisted drafts, sign-in, results and feedback; run existing estimator checks, lint and build.
5. Review screenshots at narrow and wide widths. Paid access remains a separately configured release decision.

## Exact image generation prompt

Use case: photorealistic-natural.
Asset type: website hero photograph for the right-hand side of a dark navy running-shoe resale price estimator.
Create a believable editorial product photograph of one completely unbranded adult road-running shoe resting firmly on a lightly weathered charcoal concrete bench. Conventional functional shoe construction, warm off-white breathable engineered mesh, muted grey overlays, ordinary off-white foam midsole and dark grey rubber outsole. Three-quarter side view, toe points left, heel right. Shoe is very lightly used: tiny realistic dust marks on the outsole, restrained natural creasing, laces tied with slightly uneven loose ends. No dramatic dirt.
Composition: landscape 3:2, entire shoe visible with generous clearance around toe and heel, shoe occupies the right two-thirds, a calm softly shadowed navy-charcoal backdrop and darker negative space toward the left for a gentle blend into a navy webpage. No lettering or UI baked into the photograph.
Lighting: a single large soft window from upper left, physically believable contact shadow, matte surfaces, natural tonal range, subtle real-camera grain. Real camera product photography, approximately 70mm lens at f/5.6, enough depth of field to read the mesh and stitching, gently softened background. Quiet, everyday, credible, carefully photographed rather than glossy advertising or a computer render.
Strict constraints: completely generic design, no recognizable brand-specific logo, stripe motif, swoosh, wordmark, tongue label, embossed lettering, tags, watermark or text anywhere. Correct and consistent stitching, sensible lacing, realistic sole geometry and material thickness. No second shoe, no people, no hands, no props, no floating shoe, no pedestal, no neon glow, no cinematic fog, no plastic sheen, no impossible curves, no illustration or 3D-render look. Opaque background. This is the shoe photo only, not a screenshot or website mockup.

