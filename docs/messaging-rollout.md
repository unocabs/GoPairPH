# Go Pair PH messaging rollout

Private text conversations now include editable questions/replies, listing-linked offers, My Buying, mute/archive, block/report, and delayed unread email. Messenger remains an optional external channel. Weekly listing-view reports have been removed from the API, email preview, and Vercel schedule; existing view statistics are retained.

## Required manual deployment steps

This project **does not auto-apply Supabase migrations**. In the intended project's Supabase SQL Editor, run these files in order:

1. `supabase/migrations/055_messaging_and_notification_queue.sql`
2. `supabase/migrations/056_marketplace_chat_offers.sql`
3. `supabase/migrations/057_notification_collectors.sql`

They require the earlier migrations through 054. Existing offers and accepted shop orders are preserved. Duplicate pending requests for the same buyer/listing/size are collapsed into history, retaining the newest pending request. Legacy notes stay intact rather than becoming a fabricated historical chat.

Use this deployment sequence to keep existing offers working:

1. Apply migrations 055–057 while the current release serves traffic. They temporarily preserve its existing RLS-protected direct purchase-write permissions.
2. Deploy this code with `NEXT_PUBLIC_MESSAGING_ENABLED=false`. Its offer/status endpoints use the new atomic RPCs. Deployment removes the weekly Vercel schedule and schedules saved-search alerts daily at 02:00 UTC (10 AM Manila, subject to the hosting plan's timing precision).
3. Confirm `/api/admin/notifications/process` exists in production: an unauthenticated request should return 401. Do not run an authorized worker merely to test routing; it can send email or change state.
4. In the SQL Editor, run **`supabase/setup/notification-dispatch.sql`**. This required post-deployment activation revokes legacy direct purchase writes and schedules the frequent dispatcher. Running it before deploying the RPC-backed endpoints would break the old release's direct inserts/updates.
5. Set `NEXT_PUBLIC_MESSAGING_ENABLED=true` and redeploy. This flag controls new discovery entry points; existing inbox deep links and RPC-backed offers remain usable during rollout.

The setup requires Supabase Cron (`pg_cron`), `pg_net`, and Vault. Reuse Vault's existing `gopair_payment_app_url` and `gopair_payment_cron_secret` names; the latter must match the **existing** Vercel Production `CRON_SECRET`. Do not rotate that secret or replace payment reconciliation. The existing `RESEND_API_KEY` and transactional sender settings are still required.

The named `gopair-notification-dispatch` job runs every minute, separately from payment reconciliation. It can be scheduled again without creating duplicate named jobs. A per-minute schedule is intentionally absent from `vercel.json`, preserving Vercel Hobby compatibility. Verify the HTTP response as well as Supabase Cron history: queueing a request is not proof the worker succeeded.

## Customer flow

- Message Seller offers Go Pair PH chat and, when the seller supplied a usable contact, Messenger. With only native chat available, it opens directly. A buyer's Facebook handle is not required.
- Opening a composer creates no empty thread. The first message or formal request creates/reuses one conversation per buyer, seller, and listing.
- Templates insert editable drafts and never send automatically. Custom text, Filipino/English, Unicode, and multiline messages remain supported. The limit is 2,000 characters per message, with no lifetime conversation cap. Burst protection starts at 30 text messages/minute and 20 new chats/hour.
- Questions do not reserve stock. Send Offer, Request to Buy, Place Order, and Request Free Shoes record formal requests. Pending offers can be revised; stale versions cannot be accepted. Price, stock, block, ownership, and request-state rules run in the database.
- My Buying exposes Saved, Inquiries, Offers, Reserved, Completed, and History. Inquiries exclude conversations with formal requests. Buyer withdrawals are distinguished from seller declines.
- The active request and its controls stay above the messages. All existing stock/closure paths record corresponding conversation events. Acceptance does not imply that Go Pair PH processed payment for the shoes.
- Mute suppresses alerts; archive tidies the inbox and a new incoming message resurfaces it. Block stops new messages and offers while preserving history. Withdrawal/cancellation remains available so a block cannot trap a reservation.
- Report review is at `/admin/messages`, restricted to admins with recorded access to the reported conversation. The latest 50 messages are available for review. Participants cannot create system events or read someone else's thread.
- Existing listing photos remain visible as context. Chat has no attachments: sellers can update listing photos, or customers can choose Messenger for sharing media. External conversations and unread states cannot be synchronized by a contact link.
- Removing a listing retains its conversation and a minimal listing summary. Account deletion still follows the site's deletion/anonymization policy. Private message text is never sent to analytics.

## Notification reliability

The first unread message schedules a check after three minutes. A read-before-send, mute, or block suppresses the alert. Eligible conversations are grouped per recipient, with one alert per conversation while it stays unread. After catching up, a later message can start a new episode. A recipient-wide 15-minute cooldown controls bursts across conversations.

Read positions advance only when the conversation is visible and scrolled to the displayed messages. Merely opening a background tab does not mark it read. Database locks preserve message order and monotonic read positions during concurrent sends.

Jobs are durable and use leases, bounded retries, stable provider idempotency keys, and frozen delivery content. A provider success followed by an acknowledgement failure retries the same delivery identity. Suppressed recipients are skipped. Missing Resend configuration returns 503 before claiming work. Eight failed attempts move work to `dead` for operator review. An unresolved delivery snapshot older than 23 hours is also held for review rather than automatically replayed beyond [Resend's 24-hour idempotency window](https://resend.com/changelog/idempotency-keys). Queued/sent state is not proof of customer receipt.

Renewal enqueueing and its reminder marker commit together. Buyback expiry queues notification work in the expiry transaction, including expiry triggered outside cron. Shipping reminders and saved-search deduplication records also commit with their queue entries. Collectors report queued counts; the dispatcher owns delivery and retries.

Chat jobs take priority over bulk reminders. The initial dispatcher handles at most five jobs per invocation with a bounded runtime. Under low load, the three-minute delay normally produces a check after about three to four minutes; backlog, scheduler, or provider delays can make it later. Monitor throughput and account limits before increasing traffic. Supabase and email have separate usage limits; this is not an unlimited-free-email guarantee.

## Read-only operational checks

```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('gopair-notification-dispatch', 'gopair-payment-reconciliation');

SELECT id,status_code,timed_out,error_msg,created
FROM net._http_response ORDER BY created DESC LIMIT 10;

SELECT kind,status,COUNT(*),MIN(ready_at) AS oldest_due
FROM public.notification_jobs GROUP BY kind,status;

SELECT id,kind,attempts,last_error FROM public.notification_jobs WHERE status='dead';
```

401 means a secret mismatch; 404 means a missing deployment or wrong URL; 503 means email configuration is missing; 500 warrants checking migrations/runtime logs. Inspect provider quota failures and dead jobs. Do not blindly clone dead jobs with a new delivery identity. Payloads include email addresses and rendered content: do not publish them in logs or analytics.

Private realtime channels are protected by membership policies and a restrictive guard against older permissive policies. Broadcasts contain identifiers; content is fetched under participant RLS. Do not replace these rules with a broad authenticated-user `USING (true)` policy. Visible-screen polling and reconnect reconciliation recover missed realtime hints.

## Verification

Run `npm test`, `npm run lint`, TypeScript, and `npm run build:check`. For database checks, set `MESSAGING_TEST_POSTGRES_URL` to a disposable **local** PostgreSQL server and run `npm run test:messaging:db`. That script creates/drops a separate database and applies the actual migrations/activation permissions. It checks private reads, idempotent sends, blocking, offer versions, unread episodes, cooldown, lease recovery, immutable retries, atomic reminders, preserved history, and concurrent stock acceptance. Never apply the test fixture to Supabase.

Browser checks use the actual UI components against isolated sample API data at 320px and 390px: editable question, send, offer submission, and seller acceptance. They do not send customer email or apply production SQL. After activation, finish with two deployed test accounts, checking access separation, scheduled HTTP results, and provider delivery records.
