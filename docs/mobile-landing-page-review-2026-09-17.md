# Mobile landing-page review — September 17, 2026

## Evidence and scope

Reviewed the public website signed out at a 390 × 844 viewport, plus the current source. Pages: `/best-running-shoes-ph`, `/guides`, `/listings/nike-pegasus-41-2`, `/listings/nike-flex-train-4e`, and `/browse`. This is a responsive-browser review, not a physical-phone or throttled-network performance test.

GA4 context: August 20–September 16 versus July 23–August 19, 2026. The latest window had 216 mobile sessions and 286 total sessions. `/best-running-shoes-ph` had 13 landing sessions; `/guides` had 7; `/browse` had 5; the Pegasus listing had 6. These small samples help select pages for inspection but do not establish why visitors left or prove an uplift opportunity.

Measurement caveat: Windsor's returned `session_conversion_rate` was above 100% for some rows and numerically matched key-event count divided by sessions. Do not treat that field as a verified fraction of converting sessions. Likewise, aggregate listing-start and publish event counts are not a sequenced, deduplicated seller funnel. Validate these definitions before measuring conversion changes.

## 1. Put listing facts before buyer actions

**Observed:** On the Pegasus listing, the first mobile screen contains the gallery, thumbnails, Message Seller, Sign in to Send Offer, and Share This on Facebook. The title starts around 875 pixels down the document, below the 844-pixel viewport; the price and size are farther down. The Messenger action is disabled because this seller has no Messenger contact configured. Its reason is exposed through an accessibility label, but the visible button still says Message Seller.

**Source:** `src/app/listings/[id]/page.tsx` renders mobile buyer actions and sharing below the gallery, ahead of the details card.

**Proposed change:** Show a compact mobile summary with shoe name, asking price, size, condition, and availability before the buyer actions. Keep the gallery prominent and provide one obvious offer/order action. Place sharing after the essential listing facts. If Messenger is unavailable, explain that visibly and emphasize the working on-site request path.

**Acceptance:** At 390 × 844, visitors can identify the shoe, price, and size without scrolling through action buttons. At 320 pixels wide, long names wrap cleanly without page overflow. No duplicate visible primary actions. Long prices, donations, multi-size shop stock, reserved listings, and owners retain appropriate behavior.

**Measure:** Buyer request starts and successful submissions per listing-view session, segmented by mobile and source. Keep Messenger contact actions separate from successful on-site requests.

## 2. Connect the running-shoe guide to the marketplace

**Observed:** The first mobile screen is an introduction and a non-interactive quick-fit panel. The comparison table has a 760-pixel minimum width. Detailed shoe cards link to external sources but have no model-specific marketplace links. The article's Browse Listings button is about 13,900 pixels down the mobile document because its desktop sidebar follows the whole article on mobile.

**Source:** `src/app/best-running-shoes-ph/page.tsx`.

**Proposed change:** Add a visible Browse running shoes action near the introduction and a Jump to picks link. Provide compact mobile pick cards or expandable summaries instead of relying on a wide table. Add Search this model links using existing browse search parameters. Keep supporting sources and detail available.

**Acceptance:** A route into the marketplace appears on the first screen at the reviewed viewport. Mobile readers can inspect the shortlist without horizontal table scrolling. Model links preserve the search intent. Searches with no matching inventory offer broader alternatives without claiming that the model is in stock. Desktop comparison remains easy to scan.

**Measure:** Guide-to-browse clicks, subsequent listing views, and buyer requests. Use click events with source page and destination; avoid internal campaign UTMs that would contaminate acquisition attribution.

## 3. Make the guides directory easier to scan

**Observed:** A long introductory block and a full-width image occupy most of the first screen. The first guide title appears around the lower portion of the screen. Visitors must scroll through large cards to discover the available topics. There are no immediate intent shortcuts for choosing shoes, buying, or selling.

**Source:** `src/app/guides/page.tsx`.

**Proposed change:** Shorten the introduction; add Choose shoes, Buying, and Selling shortcuts; use compact mobile rows with visible titles and small thumbnails. Keep image attribution attached where required. Include a clear Browse shoes link.

**Acceptance:** At least two guide choices are visible at the reviewed viewport. Titles remain readable at 320 pixels wide. Each card has a clear destination and a comfortable touch target. Desktop can retain the larger card layout.

**Performance follow-up:** The directory requests several 1200-pixel Wikimedia images for cards rendered about 356 pixels wide. `next.config.mjs` sets `images.unoptimized: true`, so adding a `sizes` prop alone will not generate smaller files. Use smaller source variants or prepared local assets with correct attribution. Do not change global image optimization without checking the hosting setup. Off-screen unloaded images during the review were not treated as broken images.

## 4. Surface existing alternatives when a listing is unavailable

**Observed in code:** Sold, donated, and archived listings already have an unavailable panel; similar active, in-stock shoes and more from the seller already exist. On the live active Pegasus listing, similar shoes begin around 2,136 pixels down the document, after seller and safety information. The unavailable branch does not include an otherwise active shop listing with `has_stock === false`.

**Proposed change:** For unavailable shoes, move the status and route to alternatives near the top. Include out-of-stock shop inventory in the availability design and suppress misleading purchase actions. Reuse existing recommendations rather than adding another query set. Prefer relevant size/use where supported; do not describe all same-brand results as interchangeable running shoes.

**Acceptance:** A visitor entering a sold, donated, archived, or out-of-stock page can see its status and reach available alternatives immediately. Empty recommendations still offer a useful browse or looking-for route. Reserved listings respect existing buyer-request state. Verify these states with controlled fixtures before implementation is considered complete; this review did not mutate live inventory to create them.

## 5. Preserve the browse page's useful first screen

**Observed:** Browse already shows search, a filter control, result count, and two listing cards with price, size, and condition in the first screen. Its five landing sessions are insufficient grounds for a redesign.

**Follow-up:** Verify search/size empty states and mobile touch targets when implementing the changes above. The detail route awaits several independent database reads in sequence, and discovery fetches broad joined records before rendering. Profile server timing, image transfer sizes, and mobile LCP/INP/CLS before deciding on performance work. Existing listing images already use Supabase resizing and quality transforms; global unoptimized mode does not mean all listing images are originals.

## Small reliability fix included with this review

`src/components/listings/v2/ListingV2Form.tsx` now reports draft-save success/failure, displays Saved on this device only after a successful write, and keeps the seller on the form if the pre-sign-in save fails. The failure message asks the seller to keep the page open and retry after allowing site storage. The failure event contains only surface/stage metadata.

Sign-in remains after the details steps. This limited fix does not introduce cloud drafts, cross-browser restoration, authentication-error recovery, or a new seller flow. Existing saved drafts and uploaded-photo references keep their format.

Verification: targeted ESLint and the project TypeScript check passed. Isolated execution of the actual draft-save and pre-sign-in functions passed four cases: quota failure, blocked storage access, successful draft preservation and redirect, and signed-in continuation to photos. This does not replace a real Google OAuth round trip or physical-phone testing. The fix is local and has not been deployed.

## Suggested delivery order

1. Ship the draft-save reliability fix after verification.
2. Implement the mobile listing summary and unavailable-contact treatment.
3. Add early marketplace actions and mobile navigation to the running-shoe guide.
4. Compact the guides directory and reduce image payloads.
5. Bring unavailable-listing alternatives forward and profile remaining loading delays.

Record release dates and compare mobile Philippine traffic within the same channels after release. With current traffic, report raw counts and directional changes; avoid claiming statistical certainty or running a fragmented multi-variant test.
