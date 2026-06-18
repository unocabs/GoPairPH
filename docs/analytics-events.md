# Marketplace Analytics Events

Go Pair PH sends lightweight Google Analytics events through the existing `gtag` setup. Events are intentionally action-focused and avoid personal data such as names, emails, messages, Messenger usernames, or profile identifiers.

## Buyer Intent

- `marketplace_save_listing`: buyer saved a listing.
- `marketplace_unsave_listing`: buyer removed a saved listing.
- `marketplace_request_start`: buyer opened or entered an offer, order, buy request, or donation request flow.
- `marketplace_request_submit`: buyer successfully submitted an offer, order, buy request, or donation request.
- `marketplace_buyer_request_retract`: buyer retracted a pending or accepted request.

## Seller Intent

- `marketplace_listing_create_start`: seller completed Step 1 details and moved toward photo upload or sign-in.
- `marketplace_listing_draft_saved`: logged-out seller details were saved locally before sign-in.
- `marketplace_listing_publish`: seller successfully published a listing.
- `marketplace_post_publish_share_prompt_view`: seller saw the sharing checklist immediately after publishing a listing.
- `marketplace_seller_request_status`: seller accepted, declined, reopened, or marked a request sold.

## Sharing And Off-Site Handoffs

- `marketplace_copy_listing_link`: listing link copied.
- `marketplace_copy_share_caption`: Facebook/share caption copied.
- `marketplace_share_kit_open`: listing share kit opened.
- `marketplace_share_post_start`: seller clicked into share post creation.
- `marketplace_share_post_open`: share post modal opened.
- `marketplace_share_post_download`: share post image downloaded.
- `marketplace_ask_seller_open`: ask seller/contact modal opened.
- `marketplace_outbound_click`: user clicked an off-site contact or share destination, such as Messenger, shop Facebook, or the Go Pair PH Facebook group.

## Price Estimator

- `marketplace_price_estimator_open`: user clicked from listing creation to the price estimator.
- `marketplace_price_estimate_generated`: user generated their first valid live estimate during a price-guide visit.
- `marketplace_price_estimator_to_listing`: user clicked from estimator results to listing creation.

## Useful Funnel Questions

- Do visitors who use the price estimator create listings?
- How many published listings lead to a displayed share prompt, an opened share post, and a downloaded image?
- Do listing cards or detail pages create more request starts?
- How many request starts become submitted requests?
- Do seller share actions lead to more listing views and buyer requests?
- Are buyers coordinating through Messenger after a Go Pair PH request, or bypassing before requesting?
- How many accepted requests become sold listings?

## Recommended Funnels

1. Price estimator: `/price-guide` page view → `marketplace_price_estimate_generated` → `marketplace_price_estimator_to_listing` → `marketplace_listing_create_start` → `marketplace_listing_publish`.
2. Seller sharing: `marketplace_listing_publish` → `marketplace_post_publish_share_prompt_view` → `marketplace_share_post_start` → `marketplace_share_post_download`.
3. Buyer request: `marketplace_request_start` → `marketplace_request_submit` → `marketplace_seller_request_status`.

The prompt-view and estimate-generated events are funnel denominators, not final outcomes. Keep stronger outcomes such as listing publish, share post download, and request submit as the primary key-event candidates.
