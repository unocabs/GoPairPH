# Flash Deals and paid GP Coins

Implemented November 2, 2026. This change does not deploy the site, charge a payment, or modify hosted Supabase automatically.

## Required database step

**This project does not auto-apply migrations.** Apply `supabase/migrations/062_flash_deals_and_coin_purchases.sql` in the Supabase SQL Editor after the existing migrations through 061. It runs in one transaction. Deploy the accompanying application code after the migration succeeds.

The migration adds coin purchase/refund records, Flash Deal records, price history, protected listing discount fields, and service-only financial RPCs. It also updates existing promotion checkout and offer RPCs so promotions cannot overlap and buyers receive the active sale price. The regular `shoes.price_php` stays intact. Expiry is calculated from timestamps and needs no cron to restore prices.

## Existing payment configuration

Coin checkout uses the existing `PAYMENTS_ENABLED`, `PAYMONGO_MODE`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `PAYMONGO_PAYMENT_METHODS`, and `NEXT_PUBLIC_SITE_URL` configuration. No additional checkout secret or webhook endpoint is required.

- The existing `/api/webhooks/paymongo` endpoint now handles coin purchases as well as promotions. It must receive paid checkout and the refund/dispute events already used by promotion checkout.
- The database `promotion_payment_settings.livemode` must match `PAYMONGO_MODE`, as required by the existing payment system.
- Existing `/api/admin/promotions/payments/reconcile` cron runs also verify coin purchases, including missed confirmations and refund updates. Keep its existing scheduled execution and `CRON_SECRET` authentication.
- Use a dedicated test Supabase project/accounts with test merchant credentials for provider QA. Test-mode credits are real rows in that test project's wallet and must not be treated as production credit or copied into the live project.

## Product rules

- 24 hours, 20 GP (₱10 credit value). No variable fee or subscription.
- Coin packs: 40 GP / ₱20, 100 GP / ₱50, 200 GP / ₱100. Bought coins do not expire; earned coins retain their six-month expiry and are spent first.
- Verified sellers only. One live deal per seller; each listing can join once every seven days, including early cancellation. Up to 12 deals can be live. The homepage shows two, rotated hourly; the dedicated page shows all.
- Require an in-stock marketplace for-sale listing with a photo, an active shop where applicable, no unresolved quality/running-shoe flags, and no overlapping Featured/Top Pick placement or reservation.
- Discount must be at least 10% below the lowest recorded asking price in the last seven days. History starts when this migration is applied; earlier price history is not invented.
- A failed activation spends no coins. Launch retries are idempotent. Early cancellation and sale/reservation do not refund the promotion fee.
- Ordinary asking-price edits remain free. Editing the regular price or making a listing unavailable ends its flash deal. Existing offers retain their price snapshot.

## Entry points and support

Header coin balance → `/coins`; profile coin card → wallet or `/flash-deals/new`; own listing actions → preselected shoes. Buyers find `/flash-deals` beneath Top Picks and in the mobile menu. `/help/flash-deals` explains the complete flow.

Admin → Promotion payments → **GP Coin purchases and payment recovery**, or `/admin/coins`. Recovery verifies the provider checkout against the exact order, amount, currency and mode before attaching or crediting it. A timed-out creation stays unresolved and cannot generate a replacement purchase until recovered or verified closed.

Issue refunds in the PayMongo merchant dashboard. The signed webhook or reconciliation verifies the succeeded refund and removes the matching number of credits once. A review note does not issue money. If refunded/disputed credits were used or reserved, the wallet is locked and can show a negative balance. Review the purchase, refund, ledger and existing Featured holds together before resolving a wallet lock; do not clear a hold or add credits merely because a customer returned from checkout. After a documented merchant review and any required existing-hold cancellation/adjustment, support can clear `gp_coin_wallets.locked_at` and `lock_reason` for the resolved account in SQL. Financial mutations remain inaccessible to browser roles.

## Validation

`npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build:check` cover application logic and compilation. `npm run test:flash-deals:db` requires local PostgreSQL (for example `PGPORT=55432`); it creates and drops its own disposable database and refuses remote hosts. It covers verified crediting, replay prevention, refund accounting, history-based discounts, expiry-aware fixed-price offers, RLS and concurrent launches. `npm run test:payments:db` covers regression checks for the existing promotion system.

Mobile UI was checked with sample data at 375px and 320px: no horizontal overflow, invalid discounts block launch, changing the listing updates the suggested price, and choosing a coin pack updates the exact peso payment total. The temporary preview route is removed from the implementation.

Before enabling live purchases, complete a PayMongo **test-mode** end-to-end checkout in the test project, confirm exactly one wallet credit, verify the return-to-listing draft, and test a confirmed refund. Local tests use mocked provider responses and do not charge money.
