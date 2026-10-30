# PayMongo promotion payments

Featured (₱50/7 days, ₱150/30 days) and Top Pick (₱30/7 days, ₱100/30 days) now use QR Ph through PayMongo hosted checkout. Existing shoe purchase requests still connect buyers and sellers directly. Go Pair PH absorbs provider fees (`pass_on_fees: false`). Check merchant eligibility and net proceeds for these small amounts before enabling live checkout.

## 1. Apply the database migration

**This project does not auto-apply migrations to Supabase.** With payments disabled, run the complete contents of `supabase/migrations/053_paymongo_promotion_payments.sql` in the **Supabase SQL Editor**, after existing migrations through 052. Do this before deploying the new checkout code. Back up the database first using the project's normal process.

Migration 053 preserves legacy promotion orders and stored screenshots for admin review. It disables creation/submission through the old public reservation, screenshot, and coin payment RPCs. Existing legacy admin review functions continue to work. The old HTTP submission endpoints return 410 and ask sellers to refresh.

Payment records retain their related listing/profile/order for billing history. Deletes that would destroy linked payment records are restricted. Seller listing archives continue to work.

## 2. Configure a dedicated test environment

Set server environment variables using `.env.example`:

```dotenv
PAYMENTS_ENABLED=true
PAYMONGO_MODE=test
PAYMONGO_SECRET_KEY=<the merchant test secret key>
PAYMONGO_WEBHOOK_SECRET=<this environment's webhook signing secret>
PAYMONGO_PAYMENT_METHODS=qrph
NEXT_PUBLIC_SITE_URL=https://<stable-test-hostname>
CRON_SECRET=<long random secret>
```

Supported method identifiers are `qrph`, `gcash`, `card`, and `paymaya`. Configure only methods enabled for this merchant. The modal displays the configured methods. QR Ph supports payments using participating banking/e-wallet apps, including BPI. The old static GCash/BPI QR images are no longer part of checkout. No secret or service-role key belongs in a `NEXT_PUBLIC_` variable.

Coin-only Featured checkout does not need provider keys or `PAYMENTS_ENABLED=true`, but requires `PAYMONGO_MODE` to match the database environment. Coin redemption retains its existing rate (2 GP = ₱1) and full-payment limit (once every 30 days). Mixed payments hold coins until verified payment, then spend them once. Confirmed expiry releases the hold; coins that naturally expired while held follow the existing wallet expiry rules.

Use a separate test database. Migration 053 starts `promotion_payment_settings.livemode` as false. Previews with test keys must never grant test promotions against the live database.

## 3. Register the webhook

Register `https://<this-environment-host>/api/webhooks/paymongo` in the PayMongo dashboard. Select these three events:

- `checkout_session.payment.paid`
- `payment.refunded`
- `payment.refund.updated`

These refund events are listed in the PayMongo dashboard and Webhooks Resource reference. `refund.succeeded` appears in another section of PayMongo's documentation but is not required when your dashboard does not offer it. The handler supports both refund-resource events and payment-resource events; it retrieves the provider records before confirming refunds. Copy this endpoint's signing secret to `PAYMONGO_WEBHOOK_SECRET`.

Webhook verification checks the raw-body HMAC, timestamp, test/live mode, and then retrieves the checkout from PayMongo. It checks the reference, stored checkout, exact centavo amount, currency, payment ID, and environment before database fulfillment. A success URL alone never grants placement. Duplicate events cannot extend a promotion or spend coins twice. Existing payments continue to reconcile even when new checkout creation is disabled.

Sellers return to `/promotions/payments?order=<reference>`. The reference survives sign-in. The page checks immediately, then every ten seconds for up to two minutes while visible. It offers refresh, resume, cancellation, and support. A cancellation return is not treated as evidence of nonpayment.

## 4. Schedule reconciliation every five minutes

Configure a scheduler to send an authenticated GET to `/api/admin/promotions/payments/reconcile` every five minutes:

```http
Authorization: Bearer <the same CRON_SECRET>
```

This is required to close abandoned checkouts and recover missed webhooks. The existing daily GP Coin job deliberately does **not** release PayMongo holds. Checkout sessions stay payable until explicitly expired. If PayMongo reports a pending/processing payment, the worker keeps the slot/coins reserved and tries again later.

For Supabase Cron, enable `pg_cron` and `pg_net` in the dashboard. In Vault, create `gopair_payment_app_url` (the canonical site URL without trailing slash) and `gopair_payment_cron_secret` (matching `CRON_SECRET`). Then run this in the SQL Editor:

For a ready-to-run version with prerequisite checks, use **`supabase/setup/paymongo-reconciliation.sql`**. It must be run manually, after migration 053 and deployment of the worker. Re-running it updates the same named job.

To generate a new secret yourself on macOS, run `openssl rand -hex 32 | pbcopy`. This creates a 64-character secret and copies it to the clipboard without printing it. Paste the same value into Vercel's **Production** `CRON_SECRET` and Vault's `gopair_payment_cron_secret`. If production already has a working `CRON_SECRET` for the existing daily jobs, reuse that value instead of rotating it. Redeploy Vercel after changing environment variables. This secret is separate from PayMongo's webhook signing secret.

**Deploy first:** a 404 from `/api/admin/promotions/payments/reconcile` means the worker is not available yet. Do not activate the schedule until that code is deployed.

```sql
select cron.schedule(
  'gopair-payment-reconciliation',
  '*/5 * * * *',
  $job$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'gopair_payment_app_url')
              || '/api/admin/promotions/payments/reconcile',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' ||
          (select decrypted_secret from vault.decrypted_secrets
           where name = 'gopair_payment_cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $job$
);
```

The endpoint checks a bounded batch of pending records, rotates unresolved creations, checks an older paid record for missed refunds, synchronizes undeliverable placements, and retries unsent confirmation emails. Each invocation has a 60-second budget. Monitor pending/review ages and increase worker throughput if volume grows. Verify cron request responses in `net._http_response` and execution history in `cron.job_run_details`. Keep job names unique per database/environment.

After five minutes, check the job in **Integrations → Cron → History** and inspect the outbound HTTP result:

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response
order by created desc
limit 10;
```

Expect HTTP 200 with a JSON `checked` count (0 is normal if there were no pending checks). Cron's `succeeded` status alone confirms that the HTTP request was queued, not that the website completed it. HTTP 401 means the deployed secret and Vault secret differ; 404 means the worker/URL is not deployed correctly; 500 requires checking Vercel logs and migration 053.

## 5. Verify before switching to live

- Test both durations for Featured and Top Pick, mixed GP Coins, and full coin checkout.
- Verify that a second checkout for the same selection reuses the original, while a changed selection requires resolving the existing checkout first.
- Close checkout and return through its cancel URL. Confirm no promotion is granted without verified payment.
- Test delayed/repeated webhook delivery. Confirm one payment, one coin spend, and one placement window.
- Reserve the last Top Pick slot from two accounts concurrently. Only one should reach checkout.
- Leave a checkout unpaid. Confirm the worker expires it with PayMongo before releasing holds.
- Complete payment after the listing closes. Confirm the payment is retained for refund review and the listing does not reactivate.
- Issue partial and full test refunds in PayMongo. Confirm recorded amounts, placement handling, and exactly one eligible coin refund.
- Confirm emails use the payment reference and payment/placement status, and the mobile flow has no screenshot upload.

Local verification commands (Node 22.15+):

```sh
npm test
npm run lint
npm run build:check
PGHOST=/tmp PGPORT=<local-postgres-port> npm run test:payments:db
```

The database test runner creates and removes its own database on an explicitly local PostgreSQL server. It applies the original 044/045/050 migrations, applies 053, and tests real transactions, permissions, RLS, refunds, coin accounting, and concurrent slot reservations. Its minimal Supabase stand-in is test-only. Never apply `tests/database/payment-fixture.sql` to a hosted project.

## 6. Enable the live environment

After provider test acceptance, set matching **live** keys, webhook secret, `PAYMONGO_MODE=live`, canonical HTTPS URL, and supported methods in the production host. Keep `PAYMENTS_ENABLED=false` during setup. On the **production database only**, run:

```sql
update public.promotion_payment_settings set livemode = true where id = true;
```

Enable `PAYMENTS_ENABLED=true` only after the migration, live webhook, reconciliation schedule, and merchant account are ready. Do not toggle a live database into test mode. Do not reuse Keeply's signing secret automatically: Go Pair PH needs its own registered endpoint and configured merchant credentials.

## Operations and exceptions

- **Unresolved session creation:** a provider timeout can mean a payable session exists even if its ID was not saved. The system keeps the order and holds instead of silently creating another checkout. In Admin → Promotions, find its reference in PayMongo, use **Recover checkout**, and enter the `cs_` ID. The backend verifies the reference, amount, and environment before attaching/fulfilling it. If the provider session is expired, recover it first and then verify status to release holds.
- **No session found:** an operator must establish that no payable session or payment exists for the reference, including any timed-out request, before manually resolving the order. Do not release an unknown checkout just because 20 minutes passed. Escalate to PayMongo support if uncertain. A definitive provider rejection (400/401/403/404/422 during creation) automatically releases its unused local reservation.
- **PayMongo refunds:** issue them in PayMongo. **Flag for review** records a note; it never sends money. A verified successful full refund ends the placement and restores eligible spent GP Coins once. Partial refunds are recorded separately and flagged for review. Refund IDs and amounts are reconciled with PayMongo, not trusted from browser input.
- **Undeliverable queued placement:** the worker flags the PayMongo payment for refund review and restores eligible coins. Coin-only payments can be refunded directly to the coin wallet. A promotion ending because shoes sold after activation retains the existing no-unused-time-refund policy.
- **Legacy orders:** review pre-cutover screenshots in the legacy sections of Admin → Promotions. New PayMongo/coin orders cannot be approved or rejected through those legacy review functions.
- **Emergency disable:** set `PAYMENTS_ENABLED=false` to stop new PayMongo checkouts. Leave webhook credentials and reconciliation running to settle existing payments. A code rollback alone does not restore retired manual RPC permissions.

References: [PayMongo hosted checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [session lifecycle](https://docs.paymongo.com/docs/payment-channels-key-concepts), [webhook signatures](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management), [Supabase scheduling and Vault](https://supabase.com/docs/guides/functions/schedule-functions).
