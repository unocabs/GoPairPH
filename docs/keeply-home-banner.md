# Keeply homepage banner

## Implementation

Keeply is slide 1 of 6 immediately below the existing homepage hero/feedback strip. GP Coins is slide 2. The remaining slides keep their original order: Price Guide, Focused marketplace, For sellers, Better buyer trust. The existing previous/next and swipe controls remain, with updated accessible counts. Offscreen slides and loop copies are excluded from keyboard navigation; the visible Keeply banner is one native link with a visible keyboard focus ring.

Destination (also verified in the destination browser after navigation):

```text
https://www.keeplyph.com/demo?utm_source=gopairph&utm_medium=referral&utm_campaign=gopair_home_banner
```

The approved PNG was copied byte-for-byte to `public/home-carousel/keeply-gopair-banner-v1.png`. Its delivery copy, `keeply-gopair-banner-v1.webp`, retains all artwork at 1983 × 793, encoded with `cwebp -q 90 -m 6`. It is 141,734 bytes versus 1,661,935 bytes for the PNG (91.5% smaller). Next.js Image renders the delivery copy with the existing static-image pipeline; global `images.unoptimized` remains enabled as before. The first banner has stable priority loading, a reserved exact aspect ratio, and contain fitting without hover enlargement to avoid cropping the artwork. There are no new runtime dependencies or database queries.

## Tracking and consent

`trackKeeplyAdClick` uses the existing `trackEvent`/`window.gtag` setup. Only trusted primary `click` (including native Enter activation) or middle `auxclick` sends `keeply_ad_click`. There are no document event subscriptions, keydown analytics handlers, impression handlers, or carousel-transition events. Repeat activations are intentionally retained. Swiping suppresses a follow-up compatibility click.

The only custom parameters are:

```json
{"advertiser":"keeply","placement":"homepage_promo_first","campaign":"gopair_home_banner","link_domain":"www.keeplyph.com"}
```

The repository currently has no analytics consent UI or CMP; the existing root layout unconditionally configures its GA tag. This change preserves that existing policy. The new event checks the latest standard `gtag('consent', 'default'/'update', {analytics_storage: ...})` commands in the existing dataLayer at activation time, suppressing sending on explicit denial. It also honours `ga-disable-G-LH99NEKGMC`, Do Not Track, and Global Privacy Control. Declined clicks are never saved for later replay. This does not add a sitewide consent interface or change consent behaviour for older marketplace events.

Navigation uses the native anchor without awaiting analytics or a network acknowledgement. Missing or throwing analytics cannot cancel it. The tagged URL remains unchanged. No tracker or Keeply measurement property was added.

## GA administration completed

Verified in GA Admin before changing settings:

- Account: `393901402`.
- Go Pair PH property: `536547109` (also confirmed through the connected Windsor account).
- Web stream: Go Pair PH, URL `https://gopairph.com`, stream ID `14827706010`.
- Measurement ID: `G-LH99NEKGMC`, matching `src/app/layout.tsx`; zero connected site tags were shown.

Created `keeply_ad_click` using **Create with code** and **Mark as key event**. Reopened the saved settings to verify **Once per session** and **Don't set a default key event value**. No derived event or `gopair_ad_visit` was created. GA's ordinary event counts are unaffected by the key-event counting method.

## Verification

- Actual local homepage inspected in desktop Chrome and at 390 × 844: Keeply first, GP Coins second, full image and copy visible without cropping, image loaded at its original dimensions, no mobile horizontal document overflow. Existing hero source was untouched.
- Tab enters the visible banner, with a visible focus ring. Enter, mouse, Command-click and middle-click each incremented the captured event count exactly once with the exact static payload above. A component remount did not multiply handlers.
- All six slides were visited in order through the actual carousel controls; next/previous transitions left the captured event count at zero.
- Explicit declined-consent capture sent zero events. Tests also cover consent updates, GA disable, DNT and GPC, absence of a tracker, tracker exceptions, and an unresolved tracker promise that is not awaited.
- Native navigation with missing and throwing trackers reached the exact tagged destination. All three UTM parameters remained in the browser address after Keeply loaded.
- Two genuine activations from the actual local homepage were received in **Go Pair PH Realtime** as `keeply_ad_click` with event count **2**. Realtime drilldown showed the advertiser value `keeply`, count 2. Local instrumentation separately verified all four custom parameter values. These are development verification activations in the real property, not evidence that the deployed homepage is already updated.
- Lint, automated tests and the production build passed. Homepage title, H1, canonical, index/follow metadata and Organization/WebSite JSON-LD were inspected. The local environment uses a localhost site URL; deployment must retain `NEXT_PUBLIC_SITE_URL=https://gopairph.com` for the production canonical.
- No physical-phone touch test, throttled-network Lighthouse run, or field Core Web Vitals measurement was performed. Desktop/mobile checks used responsive Chrome. No Keeply code or GA settings were changed, and Keeply acquisition-report receipt was not checked or claimed.

## Remaining release work

Deploy the Go Pair PH code and assets, then smoke-test the production homepage link and repeat an activation in Go Pair PH Realtime. Key-event registration is already complete; production banner delivery is not live until deployment. No database migration is needed.
