# Price estimator feedback

Implemented locally November 1, 2026. This feature collects opinions about the current formula; it does not enable premium payments, market-price crawling, or the new pricing engine.

## User and admin behavior

The estimator result includes **Give price feedback** beside its price summary. Submissions require a reason (**Too low** / **Too high**) and the price the user thinks is appropriate. A short explanation is optional. The suggested price must be above the reviewed price for Too low, or below it for Too high. Users can submit without signing in; signed-in submissions attach their account and contact email automatically.

The server validates the inputs and independently recalculates the formula result. It stores the reviewed asking/fast-sale price, range, engine version, brand/model, condition, mileage bucket, age bucket, demand, urgency, packaging, receipt, and flaws. These are user-supplied shoe details and opinions, not verified transaction evidence. Local snapshot corrections cannot silently change past feedback. No feedback automatically changes the estimator's coefficients.

In **Admin → Feedback**, admins can inspect existing general app feedback alongside price feedback, filter category/status, paginate through 30 submissions per page, and mark submissions reviewed, closed, or new. All-time totals and the top 20 shoe/condition groups collate Too low / Too high opinions. These groups match entered model text; they are not a normalized market catalogue. The dashboard shows the exact price the user reviewed and their suggested price. Global summary counts are labeled separately from filtered results.

Each estimator card and new admin email presents the entered original SRP, app resale price reviewed, user's suggested price, full app range and fast-sale value, and the peso/percentage difference from the reviewed price. Comments are explicitly labeled; missing comments show “No additional comment provided.” Readable condition, mileage/age buckets, box, receipt, flaws, seller-selected demand, and selling goal help evaluate the suggested price. Calculation version, saved app confidence, and app reasoning remain available in the card. These values come from the stored submission, not today's recalculation. Mileage/age are shown as buckets because exact values are not collected by the current estimator. No additional migration is needed for this display enhancement; migration 058 already saves the input/output snapshot.

## Apply the migration before deployment

**This project does not auto-apply migrations to Supabase.** Run the complete contents of **`supabase/migrations/058_price_estimator_feedback.sql`** manually in the **Supabase SQL Editor**, after the existing feedback migration 034 and the project's migrations through 057, before deploying this feature.

Migration 058 extends the existing feedback table, preserves historical feedback, enables price snapshots, and adds a private email outbox. Existing rows are marked `legacy` (historical delivery not tracked) to avoid replaying historical notifications or claiming delivery was confirmed. Both general and estimator feedback now use an atomic, server-only submit function; anonymous/authenticated direct database reads/writes and direct execution of the outbox/summary functions are denied. The existing app feedback endpoint is updated in the same deployment. Do not deploy only half of this change.

Submission IDs make same-content retries idempotent. A privacy-preserving keyed hash of the account ID or request address supplies a shared rate limit: one new submission per ten seconds and no more than twenty in a rolling 24-hour period. Raw request addresses are not stored. This is basic abuse resistance, not identity verification; anonymous users behind the same network can share a limit. Production must provide trustworthy forwarding headers, as on the configured Vercel deployment.

## Admin email and durable retries

New submissions are saved before any email attempt. Notifications go to `ADMIN_NOTIFICATION_EMAILS` and admin-profile email addresses resolved by the existing admin recipient helper. If no admin recipient resolves, the fallback is `FEEDBACK_TO_EMAIL`, then `hello@gopairph.com`.

Configure `RESEND_API_KEY` and the existing transactional sender/domain as described in the email rollout. Each notification retains its recipient/content snapshot and stable provider idempotency key. Suppressed recipients are respected. Missing email configuration or provider failures leave the notification pending for retry; a successful feedback response only confirms storage, not inbox delivery.

The existing **`/api/admin/notifications/process`** worker also processes feedback email retries. Ensure the notification-dispatch schedule in `supabase/setup/notification-dispatch.sql` is already active and uses the deployed `CRON_SECRET`. The worker claims at most three feedback jobs at a time, uses five-minute leases, and backs off failures up to hourly retries. New submissions also attempt delivery immediately. No additional monthly crawl or paid-plan scheduler is created by this feature.

Check **Admin → Feedback → Email** for `pending`, `sent` (accepted by the provider), or `suppressed`. Review Resend delivery logs for actual inbox delivery/bounces. Persisted delivery snapshots keep retries stable if recipient configuration or templates later change. Resend's idempotency retention is provider-limited, so investigate unusually long unresolved delivery incidents rather than repeatedly forcing sends.

## Verification and release checks

- `npm test` covers required fields, direction/price consistency, server-generated snapshots, stale/tampered estimates, anonymous submissions, origin/body limits, admin-only access, email retry behavior, and escaping.
- `npm run test:feedback:db` starts and removes its own socket-only, temporary local PostgreSQL cluster. It tests migration 034 → 058 with historical data, table/RPC permissions, constraints, same-content retries, rate limits, concurrent submissions and email leases, stable delivery snapshots, backoff, and global/model aggregation. It never uses Supabase or `.env.local`. Requires local `initdb`, `pg_ctl`, and `psql`.
- `npm run lint` and `npm run build:check` check the full application.
- Before enabling production, submit one controlled sample, verify it appears under the correct category and reviewed price, confirm one admin notification, and exercise a reviewed/reopened status. Check anonymous and signed-in submissions and a narrow-screen result form. Do not submit synthetic feedback to real admins as part of local automated tests.

## Premium rollout boundary

The accepted provisional examples (Evo SL ₱4,500, Novablast 5 ₱4,300, Pegasus 41 ₱2,900 under the shared test assumptions) are human-reviewed research anchors. They are not newly fitted formula outputs or verified sale labels. Keep implementing the data audit, dated source references, pricing calibration, and paid access checks in the premium review plan. Feedback supplies review signals; it must not automatically override actual sale evidence or be used as held-out price ground truth.
