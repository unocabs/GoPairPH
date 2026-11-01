# Estimator beta and premium implementation — November 1, 2026

The v2 estimator, account history/comparison/export, feedback snapshots, admin evidence review, monthly reference workflow, and manually renewed PayMongo access are implemented locally. **This is a free research beta. Paid access is deliberately disabled.** No production migration, worker schedule, provider checkout, or deployment was performed during implementation.

## Evidence and release decision

A bounded, read-only production inventory found 124 listings (115 active, 5 sold), 67 with original SRP, 109 distinct normalized brand/model combinations, and 3 completed requests (2 with offer amounts). These offered amounts are not reliably recorded final settled prices. One feedback record existed. No private chat messages were mined and no users were contacted.

This does not supply 50 independent, usable final-price validation outcomes. Do not advertise accuracy or turn on billing on the strength of the synthetic tests. The initial scope is the original Adidas Adizero Evo SL, ASICS Novablast 5, and Nike Pegasus 41. Exact normalized aliases only: Evo SL Woven/EXO, different generations and ambiguous models do not inherit the original Evo SL reference. Other shoes use an explicitly unverified entered-SRP fallback with low confidence. Rare sizes, repairs, trail/racing depreciation, shipping and eligibility-specific discounts are not separately modeled; those remain pilot limitations.

The three Nov 1 manually reviewed retail observations are preserved in migration 059 with exact URL, SKU, colour, regular price, offered price and unknown size availability:

| Model | Regular / observed offer | Good, 20km asking suggestion |
| --- | --- | --- |
| Original Evo SL | ₱8,500 / ₱6,800 | ₱4,500 |
| Novablast 5 | ₱9,290 / ₱6,503 | ₱4,300 |
| Pegasus 41 | ₱7,395 / ₱4,437 | ₱2,900 |

These are dated retail offers and provisional regression anchors, not market-validated resale transactions. References expire after 35 days or earlier stated expiry; known sold-out offers are excluded. Unknown stock stays visible as unknown. Box, receipt, seller demand and urgency cannot manufacture a price premium or high confidence. No numeric sale-probability score remains. V1 buyback and Great Deal formulas remain unchanged. Blank defaults avoid treating the demonstration shoe, receipt or mileage as a real user declaration.

Condition-only beta ranges are new 85–95%, like-new 72–82%, good 60–70%, fair 35–50% of the qualifying retail reference/fallback. Mileage and ownership age use the larger adjustment to reduce double counting; flaws apply a further deduction. Five independently grouped, buyer-and-seller-confirmed matching resale observations can replace the heuristic center with a robust median. These ranges are descriptive, **not statistical confidence intervals**. Matching outcome mileage/size remains a limitation; do not call medium confidence verified accuracy.

## Manual database setup

**This project does not auto-apply migrations to Supabase.** Run, in order, in the Supabase SQL Editor:

1. `supabase/migrations/058_price_estimator_feedback.sql` if not already applied (after existing migrations). This adds feedback snapshots and durable admin notification delivery.
2. `supabase/migrations/059_estimator_platform.sql`. This adds the isolated estimator tables/RPCs, owner-only reads, source registry and seed observations. Both premium and automated collection default off. Do not rerun an already applied migration.
3. After deploying worker routes, optionally run `supabase/setup/estimator-jobs.sql` with the documented Vault secrets, pg_cron and pg_net. Existing notification dispatch must also be configured for email retries; see `docs/price-feedback-rollout.md`.

A missing 059 returns a setup/unavailable state. Apply the migration before releasing the new page. Never paste environment secrets into migration files. The new tables are independent of promotion payments and verification.

## Reference maintenance

Admin → Estimator lists sources, recent/staged references, provenance-aware resale observations and payments needing review. Admin → Feedback retains original SRP, app price/range/fast strategy, preferred price, delta/percentage, reason, actual comment, condition, exact km, age, proof, retail source/variant/date, evidence tier and engine version. V2 submissions load the account-owned saved estimate on the server; client-supplied output/SRP is ignored. V1 feedback remains readable. New feedback attempts admin email immediately and uses the existing durable retry worker if delivery fails.

Manual workflow: check the exact linked retail variant, enter current/regular PHP prices and the observation date, leave availability unknown unless checked, then publish. Unpublish obsolete or ineligible offers. Stored estimate and feedback JSON does not change when a catalogue entry changes.

Optional collection: record actual collection permission/terms in Admin → Estimator before enabling a source. The worker accepts only registered HTTPS hosts, disallows redirects, limits response bytes and time, and reads exact-SKU Product/Offer JSON-LD with PHP currency. Aggregate or ambiguous prices fail closed. Prices are staged unpublished; review before publishing. Parsed regular SRP is not inferred: the initial staged record uses the offered price for both fields; unpublish and add a reviewed manual reference if a distinct SRP is needed. Current adapters may fail on blocked pages or changed markup; this is expected and retains the previous published observation until it becomes stale. Manual maintenance is the supported fallback. No retailer collection permissions have been established by this work.

Successful sources next run on the first day of the following calendar month; failures retry the next day. The daily scheduler claims only due permitted sources, up to three with row leases. A cron HTTP 200 reports staging, not publication or successful accuracy validation.

## Access and payments

- Beta: free signed-in estimates; beta results do not consume the future free trial.
- Premium mode: one saved full result free per account; same-model corrections end 24 hours after the original trial, not 24 hours after the latest correction. Duplicate requests are idempotent; simultaneous requests cannot acquire two trials. Previously saved results remain accessible without renewed payment.
- Monthly: ₱50 / 5,000 centavos, one **calendar month**, manual renewal. Extend from the later of verification time/current monthly expiry, using Manila month-end clamping. Preview dates are shown before checkout; the final period begins on verification.
- Permanent: ₱600 / 60,000 centavos, no scheduled expiry, for the operating life of this estimator service. No automatic upgrade credit. Existing permanent owners cannot accidentally buy another monthly plan.
- Both paid plans use the same estimator/history/comparison/export. Temporary anti-abuse throttling is not a commercial monthly quota. No per-estimate LLM or search API is used.
- A payment return URL never activates access. Only a verified provider payment with matching amount, PHP currency, mode, checkout and account/order reference creates one grant. Duplicate webhooks are safe. Refunds revoke only the relevant fully refunded grant; partial refunds require review. Disputes suspend the relevant grant.

Use existing `PAYMONGO_MODE`, secret, method settings, site URL and `PAYMENTS_ENABLED`; add `ESTIMATOR_CHECKOUT_ENABLED=false` and a **separate** `ESTIMATOR_PAYMONGO_WEBHOOK_SECRET`. Register `/api/webhooks/estimator-paymongo` for checkout-paid/refund/dispute events in the matching provider environment. Existing promotion integration is unaffected. Reconciliation continues when new checkout is disabled.

Unresolved checkout creation is held for review instead of risking a duplicate charge. Locate the PayMongo checkout by the saved UUID reference, then use the admin verification form. It re-fetches the provider session and checks identity/amount before recovering it. Never manually mark an unverified payment paid. An authoritative verified paid provider session can activate its original order even after local expiry; account, checkout, mode and amount checks still apply. Never resolve delayed confirmation by blindly opening another checkout. Refund/dispute resolution and failed payment confirmation must be tested in the merchant's test environment before live sale.

PayMongo documents subscriptions for cards/Maya, with merchant capability requirements; QR Ph manual checkout is the initial implementation. There is no automatic recurring mandate. References: [subscriptions](https://docs.paymongo.com/docs/payment-acceptance-subscriptions), [refunds](https://docs.paymongo.com/docs/payment-acceptance-refunds).

## Evaluation and remaining launch gates

Run:

```sh
npm test
npm run test:feedback:db
npm run test:estimator:db
npm run benchmark:estimator
npm run lint
npm run build:check
```

The complete suite currently passes 164 automated tests, the isolated feedback and estimator database checks, clean lint, and a production build. Browser QA used isolated fixtures for narrow 320px/375px layouts and the result/required-feedback controls; it did not send production emails or test real billing. Hardware/network performance targets and staging end-to-end QA remain unmeasured.

Both database scripts start and remove their own temporary socket-only PostgreSQL cluster; they do not read `.env` or touch Supabase. They require local `initdb`, `pg_ctl` and `psql`.

`docs/estimator-synthetic-benchmark-2026-11-01.json` compares v1 and v2 across 48 frozen synthetic scenarios. It deliberately records `market_accuracy_proven: false`. To evaluate a real private dataset:

```sh
npm run benchmark:estimator -- --dataset /private/path/outcomes.json --output /private/path/report.json
```

Dataset contract: `models`, `references`, `training` (SaleObservation fields with genuine confirmed final prices), `holdout` (at least 50 distinct independent sellers; each row has `id`, `seller_group`, `model_id`, `sold_at`, `estimated_at`, `input`, `price_php`, `provenance: buyer_seller_confirmed`, `evidence_note`), and `policy` (`frozen_at`, `calibration_report`, `target_coverage`, `maximum_median_relative_width`). Keep raw data and seller grouping private. Training must precede all holdout estimates; sellers/transaction IDs cannot cross the split; source observations are evaluated at estimate time. Unknown-age v1 baseline uses its 1–2 year bucket, disclosed here because v1 lacks unknown age.

Report median percentage/peso errors, p90 errors, signed error, interval coverage/width and model groups against v1, simple retail depreciation and available comparable-median baselines. The evaluator checks 20% median percentage improvement, practical peso improvement, no >5% p90 regression, frozen coverage/width targets, and at least 10 holdout outcomes per declared model. It never changes settings. Independently review data provenance, subgroup uncertainty and sparse coverage; do not tune to the holdout. Calibration cases are not holdout cases.

Still required before paid launch: sufficient genuine outcomes; accuracy/coverage review; two real reference refresh/review cycles; consented runner/repeat-seller pilot and willingness-to-pay evidence; provider test-mode same-phone checkout, refunds/disputes and delayed-event recovery; staging end-to-end signed-in/admin/email QA; measured mobile and warm-API performance; merchant-specific fees and long-term cost review. These require real-world evidence, not more synthetic rows.

Illustrative economics using the prior plan's standard QR Ph fee assumption (1.34% plus VAT on fees): approximately ₱49.25 net on ₱50, ₱591.00 on ₱600, before database, hosting, review, support and refund costs. At ₱1 ongoing service cost per active user-month, permanent contribution before fixed costs is roughly ₱579 / ₱555 / ₱531 after 1 / 3 / 5 years; at ₱10 it is ₱471 / ₱231 / −₱9. These are scenarios, not measured costs or a promise that permanent is profitable. Confirm current merchant fees and actual use before launch.

After every gate is genuinely reviewed, record actual independent outcome count and a retained private benchmark/pilot report reference in `estimator_settings`; only then set `quality_approved` and `premium_enabled`. There is intentionally no one-click “approve accuracy” button or runnable fake approval SQL. Keep `livemode=false` for test billing; test grants cannot unlock a live-mode account. Enable live settings/env only after merchant test QA. Use a separate staging database for test purchases, because trials are account-level within a database.

Rollback: set `ESTIMATOR_CHECKOUT_ENABLED=false` to stop new payments while preserving paid grants/history and reconciliation; set `premium_enabled=false` to return everyone to free beta. Disable a bad source or unpublish its reference. Never delete payments, prior estimate snapshots or permanent access to roll back a pricing change.
