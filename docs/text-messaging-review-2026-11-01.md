# Text-only marketplace messaging review

Reviewed November 1, 2026. This document records the initial source-code review and proposal. The implementation is now complete locally; see [messaging rollout](messaging-rollout.md) for the delivered behavior, verification, and required manual activation. Production configuration and delivery still require the deployment checks described there.

## Recommended product decision

Enhance the existing Message Seller action with two clear destinations: **Chat on Go Pair PH** and **Chat on Messenger**. Keep **Send Offer** visible beside Message Seller and inside every Go Pair PH conversation. Use the existing Supabase backend for persistent text messages, and the existing transactional email service for delayed, deduplicated unread alerts.

Go Pair PH chat must work without a Facebook username. The current Facebook field stores a contact handle; it is not evidence of a connected Messenger account or permission to synchronize Messenger conversations. The external option opens Messenger; it does not import messages, synchronize unread states, or prove that the buyer sent anything.

Keep inquiry, offer, and completion distinct. A question is not an offer. A message saying “deal” is not a reservation. An accepted offer is not proof of payment or delivery.

## What the existing code supports

| Area | Finding | Implication |
| --- | --- | --- |
| Listing actions | `src/app/listings/[id]/page.tsx` shows Message Seller when a usable seller/shop external contact exists, alongside Send Offer or Place Order. | Preserve the familiar entry point and extend it to sellers without Messenger. |
| Preset questions | `src/components/listings/AskSellerButton.tsx` already offers availability, photos, sole condition, meetup, and price questions; it prepares text for copying into external contact. | Reuse the concepts, but remove the copy/paste handoff for native chat. |
| Offer questions | `src/components/purchases/BuyModal.tsx` includes preset messages, including a hardcoded Pampanga meetup. Selecting a preset replaces the current message. | Separate questions from formal offers. Make location neutral and never overwrite an existing draft without consent. |
| Offer persistence | `src/app/api/offers/route.ts` creates purchase requests and validates listing/size availability. There is no idempotency or active-request deduplication in that route. | Adding an offer button in more places needs database-enforced deduplication and safe retries. |
| Transaction rules | The latest checked purchase RPCs in migration 052 distinguish single-stock reservations from multi-size shop inventory. | Share these rules across listings, chat, and tracking; do not implement a second reservation mechanism in chat. Concurrency still needs verification. |
| Seller notes | Migration 040 and the request-status endpoint store a seller note, not a message history. | Add dedicated conversation/message tables; a single mutable note cannot become a reliable thread. |
| Tracking entry points | Navbar Sent Offers and Purchase Requests links depend on nonzero active counts. The profile has separate offer, saved, and purchase-history tabs. | Expose permanent entry points with clear empty states. Counts should decorate navigation, not decide whether navigation exists. |
| Withdrawal wording | `SentOfferCard.tsx` sets withdrawn requests to declined, and presents the declined copy. | Distinguish buyer withdrawal, seller decline, cancellation, and unavailability through explicit states or reliable event reasons. |
| Email | Offer creation awaits a best-effort transactional notification, with failure logging. Existing email code supports suppression and provider idempotency keys. | Reuse delivery infrastructure, but add a durable notification outbox and scheduled processing. |
| Profile loading | `src/app/profile/page.tsx` loads broad offer/history relations, including listing images, without page limits on those queries. | Give messaging a separate, paginated route with compact summaries. Do not load chat history into every profile or listing page. |

The review establishes implementation readiness, not customer demand, live database migration state, actual traffic, or measured latency. Those require production evidence.

## Customer flow and visible actions

### Listing

Keep two visible actions: **Message Seller** and **Send Offer**. Shop listings use **Place Order**; free listings use **Request Free Shoes**. Fixed-price personal listings can use **Request to Buy** so the label matches what the buyer can actually do.

Message Seller opens a small mobile sheet with:

- **Chat on Go Pair PH** — “Keep messages and offers together.” Primary choice.
- **Chat on Messenger** — “Continue in Messenger.” Only show with a usable seller or shop contact.

When only Go Pair PH is available, open that composer directly rather than showing a single-choice sheet. Buyers do not need to save their own Facebook handle to open a seller's Messenger link. If authentication is needed, preserve the intended listing and selected question through sign-in; submit only after the buyer explicitly sends.

Opening the composer must not create an empty conversation in the seller's inbox. Create or reuse a thread atomically on the first message or formal offer. A double tap must not create duplicates.

On mobile, keep the listing actions in a compact bottom bar when the original action area scrolls out of view. Hide the duplicate action area from keyboard focus and assistive technology when inactive. Respect safe areas, cookie banners, and the keyboard. Suppress the existing floating helper on message screens to prevent overlapping controls.

### Conversation

Use one reusable conversation for the buyer, seller, and listing. Show a small listing photo, model, size, current asking price, seller identity, and availability. Existing listing photos are context; messaging remains text-only.

Keep the current formal offer in a compact summary with an exposed action: **Send Offer**, **View Offer**, or **View Reservation**. On seller screens expose **Accept** and **Decline** for an actionable pending offer. Show the actual next step when a reservation is accepted; do not suggest payment has been processed.

For a shop with multiple sizes, allow a general question before size selection. Require an explicit in-stock size when submitting an order, and show that size on every order card. Multiple requests for different sizes can share the listing conversation, each with its own request ID and status.

Use a full message page on mobile and a conversation-list/detail layout on desktop. Keep the composer usable above the software keyboard. Preserve drafts and scroll position, show a new-message indicator instead of forcing a reader to the bottom, and distinguish sending, sent, and failed-with-retry states. “Sent” means saved by the server; it does not mean the other person read it.

## Helpful templates without a restrictive chatbot

Always allow free typing, pasted text, newlines, Filipino/English, and ordinary Unicode. Start with a 2,000-character message limit, matching the existing offer-note limit. Show the counter near the limit and allow additional messages. Do not introduce a lifetime conversation-message cap.

Show at most three initial question shortcuts and a **More questions** control. Selecting a shortcut inserts an editable draft; the user presses Send. Keep existing drafts intact, and offer insertion or replacement explicitly when necessary. Avoid forced menus, automatic sends, and repetitive scripted greetings.

| Intent | Buyer draft | Seller reply draft |
| --- | --- | --- |
| Availability | “Hi! Are these shoes still available?” | “Yes, they're available.” |
| Condition | “Any damage, repairs, or sole separation?” | “The condition details are in the listing. I can clarify anything you want to check.” |
| Fit | “How do these fit compared with your usual running shoes?” | “They fit [comparison]. My usual size is [size].” |
| Shipping | “Can you ship to [city]?” | “I can ship via [courier]. The fee to [city] is [amount].” |
| Meetup | “Where and when can we meet?” | “I can meet at [public location] on [day/time].” |
| Price | “Is the listed price negotiable?” | “Please use Send Offer so I can review the amount here.” |
| Shop size | “Is [selected size] available?” | “That size is available. Please use Place Order so I can confirm it.” |
| Extra proof | “Could you add a close-up of the outsole and size tag to the listing?” | “I've updated the listing photos. Please check them before deciding.” |

Bracketed values are required inputs, not literal text that can be sent accidentally. The seller must confirm availability and condition; never auto-claim “authentic,” “no defects,” stock, shipping charges, or a guaranteed fit from incomplete data. Only show the updated-photo reply as an editable suggestion; do not send it automatically.

Make templates contextual. Hide price-negotiation prompts for fixed-price/free listings, show pickup questions for free shoes, and include a selected shop size only when the customer selected one. Show factual listing details as labeled reference information rather than pretending the seller replied. User preferences and measured usage can later guide Tagalog template variants; free typing already supports either language.

The limitation of text-only messaging is additional visual proof. Keep an exposed **View listing** link, let sellers update listing photos, and retain Messenger for customers who prefer exchanging photos there. Do not promise equivalent media support or synchronized off-site history.

## Formal offers and tracking

The same offer component and server operation should work from listings and conversations. Show the amount and size, explain that no payment happens on submission, and return the persisted request ID so the conversation can show its status immediately.

Maintain one active pending/accepted request per buyer and single-stock listing. For multi-size stock, define uniqueness by buyer, listing, and selected size, consistent with the current one-request-per-item model. Enforce this in the database, not just by disabling buttons. Reuse the existing accepted reservation instead of creating another request. A future quantity/repeat-order feature should deliberately extend these rules.

Allow a buyer to revise a pending offer with an auditable version and an explicit resubmission. A seller accepts the exact version and amount displayed; a stale acceptance must fail safely. Accepted amounts and sizes cannot be silently edited. A typed seller price suggestion is not a formal counteroffer or acceptance; prompt the buyer to update the recorded offer. Rich counteroffers can follow after the initial release.

Write request-state changes and system timeline events together in a transaction, including reservation, cancellation, and completion. All entry points—including existing profile actions and stock-closing paths—must use that shared behavior. The database remains the authority for stock, price rules, ownership, and state transitions. The current offer route should also validate negotiability and amounts server-side; frontend-only price restrictions are insufficient.

Expose permanent **Messages** and **My Buying** navigation. My Buying can initially link to a lightweight view of the existing data rather than replacing the entire profile. Organize it as **Saved**, **Inquiries**, **Offers**, **Reserved**, and **Completed**, with declined/withdrawn/cancelled records available in history. A conversation becomes an inquiry only after the buyer sends; it does not automatically save a listing or count as an offer. Provide deduplicated status views so the same shoes do not appear as several unrelated tasks.

Unread badges mean unseen activity. Pending/accepted counts are separate state counts; a pending offer the buyer has already seen should not keep a “new message” dot active.

## One email for unread recent chat

Recommended starting policy:

1. Save the message immediately. Schedule an unread notification check three minutes after the first new unread message. Additional messages do not keep postponing that first check.
2. At send time, check the recipient's persisted read position, mute setting, account eligibility, block state, and email suppression. Do not email if the messages were read.
3. Send one email for the unread conversation episode, combining all currently eligible conversations for the same recipient when practical. Link directly to the conversation, with only a short, escaped preview and no unnecessary personal information.
4. Five messages arriving before the alert produce one email. Further messages in an already-notified, still-unread conversation produce no reminders. After the recipient catches up, a later message can start a new episode.
5. Start with a recipient-wide 15-minute chat-email cooldown. New eligible conversations during the cooldown wait and are grouped into the next alert; they are not discarded. This cooldown is a proposed UX default, not a provider guarantee.
6. Mute suppresses that conversation's chat email and attention alerts. Archiving only tidies the inbox; a new incoming message resurfaces it. Blocking stops new messages and offers while preserving history for the participants and reports.

An open tab alone must not mark messages read. Advance the read position only when the conversation is visible and the relevant incoming messages have been displayed. If the customer is reading older messages, leave later messages unread.

Use durable database notification jobs, a scheduled worker, provider idempotency keys, and retry/backoff. Do not use browser timers, in-memory server timers, or unawaited work after an API response. Recheck eligibility immediately before sending. Network failure after a provider accepts an email must not create a duplicate email on retry.

Offer events must not also generate duplicate chat emails. Existing offer/status email paths must coordinate with the new notification job so each event uses one appropriate alert path. If an unread batch is already pending, combine where possible. Separate genuinely new unread activity may still warrant a later email. Do not delay message persistence on email delivery, and never claim that an email was delivered merely because the message was saved.

## Efficient implementation

Reuse the installed Supabase client and existing transactional email wrapper. A full chat vendor SDK is unnecessary for this scoped feature.

Suggested data model:

- `conversations`: listing reference, immutable buyer/seller participants, compact listing snapshot, last activity, latest server sequence; unique buyer/seller/listing combination.
- `conversation_participants`: indexed membership, per-user read sequence, archive/mute state, and compact unread summary.
- `conversation_messages`: server-assigned order within the conversation, sender, plain text or server-authored event, optional purchase request/version reference, and client-generated retry key.
- Blocks/reports and a durable notification outbox with notification watermarks and delivery deduplication.

Read cursors must be monotonic and bounded by displayed, committed messages. Assign message order under a per-conversation transaction lock so late commits cannot fall behind a read cursor. Lock only the affected conversation, not the whole message table. Retried sends return the original message using a unique sender/client-message key.

Keep persisted messages in application tables. Use private database-triggered Realtime Broadcast for lightweight change notifications. Supabase recommends Broadcast over Postgres Changes for scalability and security. Authorize each user-level summary topic and conversation topic by indexed membership. Broadcast IDs and revision information, then fetch permitted data under RLS, rather than exposing message text to a topic whose authorization may have become stale after a block or membership change. See [database change subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) and [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization).

Use one shared connection per active browser tab, a private user-summary channel, and at most the currently open conversation channel. Load about 20 inbox summaries and the latest 30 messages initially. Fetch older records with stable cursor pagination, not growing offsets. Index membership lookups, inbox activity ordering, message sequence, active offer uniqueness, and due notification jobs.

Use optimistic display with a visible pending state and idempotent retry. Subscribe and reconcile against a persisted cursor so fetch/subscribe and reconnect gaps cannot lose messages. Treat Realtime as a hint; database reads recover the true state. Pause hidden-tab subscriptions after a short grace period, revalidate on focus, and offer bounded backoff polling on visible message screens if Realtime is unavailable. Keep background badges lightweight; do not load every conversation or repeatedly fetch full histories.

Cache template text in the application bundle, lazy-load the messaging UI, fetch only a thumbnail and essential listing fields, batch inbox counts, and avoid per-row queries. Do not add typing indicators, presence broadcasts, remote link previews, or read-receipt animations in the first release. Plain text links can be clickable with safe protocols and escaping; do not fetch previews or render raw HTML.

The [Supabase Realtime free allowance](https://supabase.com/docs/guides/realtime/pricing) currently lists two million Realtime messages and 200 peak connections. These are project-level allowances shared with other features, not two million customer chat bubbles or 200 total customers. Broadcast counts the send and delivery to subscribed clients; multiple devices and extra summary events add usage. Database, egress, compute, and email have separate limits. See [Realtime message accounting](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages). Check actual account plans and usage before promising free operation.

## Privacy, reliability, and launch checks

Authorize participants both on reads and writes, including direct database/API access. Only the server creates system events, memberships, notification jobs, and accepted-offer states. Sender identity comes from the authenticated session. Server/DB operations enforce blocks, rate limits, message bounds, ownership, valid active stock, and offer rules; bypassing the UI must not bypass these protections.

Start with generous burst limits for ordinary discussion and stricter limits on creating many new conversations. Expose a friendly retry time; do not silently drop messages. Keep report review restricted and audit access. Do not send chat bodies to analytics, ordinary application logs, or public feeds. Update the privacy/help pages to explain native messaging and the external Messenger boundary.

Preserve existing conversations when a listing sells, is archived, or is removed. Keep a minimal snapshot for context, disable new purchase actions when unavailable, and allow existing participants to coordinate an accepted transaction. Listing deletion must not cascade-delete the whole conversation. Account deletion/anonymization and retention need an explicit policy; “preserve history” does not override the user's deletion rights.

Before launch, verify:

- Two-account inquiry, reply, offer, reservation, withdrawal, cancellation, and completion, including multiple shop sizes and existing request paths.
- Unauthorized third-party reads/writes/subscriptions; spoofed sender/system events; direct-API bypass; immediate block enforcement.
- Double taps, two tabs/devices, duplicate requests, slow connections, failed-send retry, reconnect catch-up, and read/message races.
- Two sellers' actions cannot accept the same single-stock item twice; repeated acceptance cannot decrement multi-size inventory twice; stale offer versions cannot be accepted.
- Email read-before-delay, a five-message burst, mute/block, provider timeout/retry, worker restart, cross-conversation grouping, and overlap with offer emails.
- 320px layouts, iOS/Android keyboards and safe areas, 44px touch targets, long shoe names, large text, keyboard navigation, accessible labels, and live message announcements.
- Representative query plans and message/inbox latency under realistic concurrency, plus measured listing-page bundle/load impact. No unmeasured speed guarantees.

Track first-message success, send failures, seller response time, inquiry-to-offer conversion, offer completion, template use, blocked/report rates, unread-alert volume, and visits returning from email. Record intent IDs and aggregate timings, not private message contents. Use those results to decide whether photo attachments or richer negotiation warrant the added cost.

## Delivery sequence

1. Build private persisted text threads, first-message creation, unread summaries, retry/reconnect recovery, basic block/report, and durable unread email alerts together.
2. Integrate the Message Seller channel choices, existing request IDs and transactional status events, visible offer actions, useful editable templates, and permanent buying navigation before the customer launch.
3. Apply a feature flag, migrate safely, test with two real test accounts, and enable for a small set of sellers. Preserve current Messenger contact and existing offers throughout rollout. Observe delivery and usability before wider enablement.
4. Refine templates and navigation from observed use. Add media only if listing updates plus optional Messenger are not meeting customer needs.

This project does not auto-apply Supabase migrations. Implementation will need an explicitly identified migration applied in the Supabase SQL Editor, followed by the required Realtime settings and a deployed/scheduled notification worker. No messaging migration or application change was created as part of this review.

## Follow-up cron regression audit

Checked at the user's request before proceeding with messaging. No application code, cron configuration, secrets, or live schedules were changed. The only local deliverable remains this review document.

### Verified

- The existing test suite passes: 51 tests, zero failures. ESLint and TypeScript checks pass.
- All four `vercel.json` schedules point to existing GET handlers: listing renewal, weekly listing views, GP Coin maintenance, and buyback reconciliation. None was changed by the messaging review.
- Twenty-four additional isolated checks exercised the actual six worker handlers with mocked database/email dependencies: missing authorization, wrong secret, absent configured secret, and authenticated empty-work execution. All passed. These checks made no live database calls or email deliveries.
- Unauthenticated GETs to all six production endpoints returned HTTP 401 without redirects, including saved-search alerts and payment reconciliation. This verifies deployed route availability and rejection of unauthorized requests, not successful authorized cron execution.

### Findings to address

1. **Failed weekly email prevents retry.** `src/app/api/admin/reports/listing-views/route.ts:23` reserves a unique report window before delivery. A failure during delivery leaves the reservation behind, while the next invocation treats the unique conflict as “already sent,” without checking `sent_at`. An isolated failure/retry simulation reproduced the skipped unsent report. Use a recoverable job lease and per-recipient delivery state/idempotency; do not simply remove reservation protection and allow overlapping sends.
2. **Renewal retries can send duplicate email.** `src/app/api/admin/listing-renewal-reminders/route.ts:104` sends before saving `renewal_reminder_sent_at`, without a provider idempotency key. Simulating successful delivery followed by a failed database update produced a second email attempt on retry. Use a stable reminder-episode identity and durable delivery state, with a provider idempotency key as additional protection.
3. **Saved-search alerts have no repository-defined schedule.** `/api/saved-search-alerts/daily` exists and is deployed, but is absent from `vercel.json`; no corresponding Supabase schedule setup was found in the repository. It may have been configured manually elsewhere, so live scheduling is unverified. This is a configuration gap, not proof that the worker has stopped running.
4. **Buyback expiry notification failures are not recoverable by the next run.** The buyback route selects accepted, expiring offers, changes their status to expired through its RPC, then sends expiry email. An email failure is logged, but the next run selects only accepted offers and cannot pick up that expired record for another email attempt. This finding is from source inspection, not a live failure reproduction. A notification outbox would let expiry state transitions and retryable email work remain consistent.

These are existing reliability gaps, not changes introduced by the proposed chat feature. The current test suite does not cover these delivery failure paths; passing it alone does not establish cron reliability.

### Scheduler choice for chat alerts

Keep the existing jobs and their `CRON_SECRET` intact. The proposed three-minute unread check needs its own frequent dispatcher. Do not add a per-minute entry to `vercel.json` without verifying the deployment plan: [Vercel Hobby permits only daily cron frequency](https://vercel.com/docs/cron-jobs/usage-and-pricing), and Vercel does not automatically retry failed invocations. See [cron delivery and error behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

The repository already includes a separately named Supabase Cron setup for payment reconciliation in `supabase/setup/paymongo-reconciliation.sql`. After verifying that infrastructure in production, a separate named chat-dispatch job can reuse the scheduling pattern without replacing the payment job. Run it every minute, selecting only durable jobs whose three-minute delay has elapsed. Expected notification timing is approximately three to four minutes plus scheduler/provider delays, not an exact three-minute guarantee. Claim batches with leases, group eligible recipients, enforce deduplication, and recover from missed runs. Apply any future setup manually and verify HTTP responses as well as scheduler history; queuing an outbound request is not evidence that the worker succeeded.

### Live verification still needed

Successful production execution, active Supabase job definitions, matching deployed/Vault secrets, and actual email delivery were not verified. The available Vercel dashboard session did not expose this project's execution history. Do not run privileged production workers merely as a test: renewal, report, and buyback workers can send customer/admin email or change state. Use existing runtime logs, Supabase Cron history plus HTTP results, and notification delivery records for a read-only production confirmation.
