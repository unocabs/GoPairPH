# Go Pair PH Roadmap

This document stores parked product ideas and future implementation plans. Items here are not active tasks until explicitly selected for build work.

## Flash Sale Feature

**Status:** Parked / Future

### Goal

Help sellers create real urgency by letting them start a short, limited-time discount on an active pair. The feature should encourage faster buyer action without feeling fake, spammy, or unfair.

### Concept

- A seller can trigger a **Flash Sale** on one of their active for-sale listings.
- The seller chooses:
  - Duration: minimum `5 minutes`, maximum `2 hours`.
  - Discount percentage: proposed safe range `5%` to `50%`.
- Before enabling, show a clear warning:
  - `Once enabled, this flash sale will run until the timer ends and cannot be disabled early.`
- Once started, the sale cannot be manually disabled, shortened, or changed while active.
- Buyers see:
  - Sale price.
  - Original price with strikethrough.
  - Discount pill.
  - Countdown timer.
- Sellers get a share prompt after starting the sale.

### Suggested Seller Share Caption

```text
Flash sale on my [shoe name] for the next [duration]!
Now [sale price] from [original price].
Full details here: [link]
```

### Marketplace Behavior

- Active flash sale listings should get extra visibility because they are time-sensitive.
- Suggested priority order for default marketplace sorting:
  1. Sponsored listings with images.
  2. Active flash sale listings with images.
  3. Just-posted listings with images.
  4. Regular image-backed listings.
  5. Low-priority listings.
- Flagged listings and no-image listings should stay low priority even if flash sale fields exist.

### Future Implementation Notes

- Add flash sale fields to `shoes`:
  - `flash_sale_started_at`
  - `flash_sale_ends_at`
  - `flash_sale_discount_percent`
  - `flash_sale_price_php`
  - `flash_sale_original_price_php`
- Add a seller-only RPC or API action to start a flash sale.
- Validate:
  - Listing owner only.
  - Listing must be `active`.
  - Listing must be `for_sale`.
  - Listing must have a price.
  - Listing must have stock.
  - Duration must be between `5` and `120` minutes.
  - Discount must be within the chosen allowed range.
- Update listing cards and listing detail pages to display flash sale pricing and countdown.
- Update purchase/offer flow so an active flash sale price is captured when the buyer sends an offer/request.
- Add a seller-facing `Start Flash Sale` modal on listing detail.
- Add `Share Flash Sale` action while the sale is active.
- No background job should be required for v1; active/expired state can be calculated from `flash_sale_ends_at`.

### Promotion Ideas

- Seller dashboard prompt:
  - `Want to move this pair faster? Try a short flash sale.`
- Marketplace microcopy:
  - `Flash Sale active`
  - `Ends soon`
  - `Limited-time price`
- FB group/page post angle:
  - Encourage sellers to post clean Go Pair PH links and use occasional Flash Sales when they want faster buyer action.

### Open Questions

- Should flash sales be free or only for verified sellers?
- Should sellers have cooldowns between flash sales?
- Should flash sales have higher priority than newly posted pairs?
- Should discount limits stay at `5%–50%`?
- Should each listing have a maximum number of flash sales per week?
- Should shops and community sellers have the same flash sale rules?
