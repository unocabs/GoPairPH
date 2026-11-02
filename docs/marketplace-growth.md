# Marketplace discovery and measurement

## Rollout

This project does **not** auto-apply Supabase migrations. Before deploying this code, run these complete files in the Supabase SQL Editor, in order:

1. `supabase/migrations/060_running_shoe_reviews.sql`
2. `supabase/migrations/061_marketplace_funnel.sql`

060 backfills only explicit basketball/casual/training model-name matches. It preserves listing timestamps and does not alter categories, inventory, quality flags, payment history or GP Coin balances. Unknown models are not automatically flagged. Review and adjust the conservative match list if needed.

## Running shoe reviews

- Flagged shoes remain available at their existing URLs and in Browse, after all unflagged results. Sorting, personalization, renewal and sponsorship cannot lift them above normal listings. Normal listing ordering stays unchanged within its existing buckets.
- Homepage sponsored placements and recommendations omit flagged shoes. Regular homepage inventory can still show them after normal shoes when there is space.
- The notice and appeal text are private to owners and admins, protected by RLS. Only the public ordering bit is stored on `shoes`. No public warning badge is added.
- Owners can appeal on the listing detail page and include a manufacturer reference or supporting explanation.
- Admin → Running shoe reviews shows appeals first, then other flagged listings, with pagination. Admins can also flag or approve directly on a listing detail page.
- Approval restores normal priority and overrides automatic detection for that brand/model identity. Changing an approved listing to another explicitly detected model requires review again. Editing an already flagged listing cannot bypass review.
- This is a relevance review, not an authenticity or safety certification. Separate quality flags remain in force after running-shoe approval.
- New promotion purchases are blocked while flagged, so owners cannot pay for an unavailable placement. Existing payments and promotion windows are preserved and normal eligibility resumes after approval.

## Funnel definitions

Admin → Marketplace funnel tracks for-sale listings (not donations or swaps) and loads an aggregate only when opened, with 7/30/90-day windows beginning at Philippines midnight. No message bodies go to analytics.

- **Viewed:** distinct listings with a recorded view in the window. View events are already deduplicated by listing, visitor hash and date.
- **Inquiry:** a buyer text or purchase request after a recorded view for that listing in the window. Multiple inquiries by the same buyer about the same listing collapse to one combination. This is listing-level attribution, not proof that a particular visitor became a buyer.
- **Response:** a seller message, offer timeline response, seller note, or completed request associated with that buyer/listing after inquiry.
- **Sale confirmed:** at least one completed purchase request for the cohort. Seller-marked sales without a corresponding completed request, off-platform sales and deleted records cannot be reliably reconstructed into this funnel. Outcomes are current snapshots and can progress after the window ends.
- **Revenue:** live, verified promotion and estimator payments received in the window, less recorded refunds on those payments as of now. Before provider fees/taxes/costs; not shoe-sale GMV, not a payout balance. Legacy manual promotion receipts are not counted. Refunds for payments from older windows are not a cash-flow adjustment to this window.
- **Coins:** credits applied to paid live promotion orders, including mixed cash/coin orders, reported separately from cash. This figure is before coin returns.
- **Tests:** administrators are excluded automatically; additional test accounts can be added or removed. Exclusions apply to their inventory, inquiries, identified views and payments. Test-mode payments never enter cash revenue. Signed-out tests and historical anonymous views cannot be identified retroactively. Authenticated views gain account attribution after 061 is applied.

## Verification

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build:check`.

For database authorization, review lifecycle and revenue/cohort checks against a disposable local PostgreSQL server:

```sh
GROWTH_TEST_POSTGRES_URL=postgresql://USER@127.0.0.1:PORT/postgres npm run test:growth:db
```

The runner creates and drops an isolated test database and rejects remote hosts. Never apply the test fixtures to Supabase.
