# Go Pair PH UX Flow Audit

This is the living place to track buyer/seller workflow findings, pain points, psychology notes, and conversion ideas. Keep it practical: each finding should point to a real user moment and a possible fix.

## Standing Product Lens

- Mobile-first comfort: every key action should be reachable and understandable on a small screen.
- Fast perceived speed: avoid repeated route changes, heavy UI, slow modals, and delayed feedback after intent.
- Familiar marketplace patterns: cards, price, size, seller, save, offer/order, and status should behave like users expect from common buy/sell apps.
- Trust before transaction: show verification, seller identity, photos, condition, location, Messenger/contact availability, and clear next steps.
- Reduce cognitive load: fewer competing CTAs, plain labels, predictable button placement, and strong hierarchy.
- Keep users oriented: after every major action, show what happened, what comes next, and where to track it.
- Treat off-site handoffs carefully: Facebook/Messenger sharing can help growth, but direct messaging can also move deals outside Go Pair PH.

## Audit Runs

1. Actual Flow Audit: compare the intended workflow against what exists in code.
2. Buyer Friction Audit: inspect where buyers hesitate, leave, or fail to act.
3. Seller Friction Audit: inspect where sellers fail to list, share, respond, or close.
4. Leakage Audit: inspect where users leave Go Pair PH for Messenger/Facebook and whether that helps or hurts.
5. Fix Priority Map: rank fixes by buyer/seller impact, effort, speed impact, and mobile risk.

## Run 1: Actual Flow Audit

Status: implemented first fix pass

### What Already Exists

- Buyer can browse listings.
- Buyer can open listing details.
- Buyer can save pairs and revisit them in Profile > Saved Pairs.
- Buyer can send offer, place shop order, or request donation.
- Buyer can track pending or accepted requests in Profile > Sent Offers.
- Seller can list a shoe through a two-step details/photos flow.
- Seller is nudged to add Messenger before listing.
- Seller can copy/share listing links.
- Seller can create a share post image.
- Seller sees a post-publish share banner with suggested Facebook caption.
- Seller can review purchase requests in Profile > Purchase Requests.
- Seller can accept, decline, cancel/reopen, and mark sold.
- Seller profile shows active listings, total listing views, views this week, and active buyer request count.
- Listing cards show owner-only view counts and copy-link actions.
- Navbar shows pending purchase request and sent offer counts when present.

### Current Top Pain Points

#### Buyer

- Logged-out buyer intent is weakly captured. Cards hide actions when signed out, and detail pages use plain text like "Sign in to buy this listing" instead of a strong CTA.
- After sending an offer from a card, the success state confirms the request but does not point to Sent Offers or explain the next step.
- Messenger can let buyers bypass the Go Pair PH request flow, which may reduce tracked transactions and leave stale listings.
- Sellers without Messenger may create uncertainty even though the site allows Go Pair PH requests.
- Save Pair may be too subtle on mobile cards for users who are scanning quickly.

#### Seller

- Share Post may still be missed after the first publish moment; later it mainly lives on the listing detail page.
- Profile stats show views, but they do not strongly convert views into the next action, such as sharing again.
- Sellers can skip Messenger, then later become harder to close with.
- Purchase requests depend on email plus the user noticing Profile/Navbar counts; if the seller does not revisit, response lag can hurt buyer confidence.
- Accepted requests still rely on off-site coordination; if buyer contact details are weak, the seller may stall.

### Leakage Risk

Primary risky path:

```text
Buyer sees listing -> Messages seller directly -> Transaction happens outside Go Pair PH -> Seller forgets to mark sold -> Listing becomes stale
```

This does not mean Go Pair PH needs in-app chat immediately. A better v1 may be:

```text
Send request first -> Seller accepts -> Coordinate on Messenger -> Seller marks sold
```

### First Fix Candidates

1. Add logged-out CTAs: "Sign in to Send Offer", "Sign in to Save Pair", and return to the listing after sign-in. Implemented.
2. After buyer submits an offer, show "Request sent. Track it in Sent Offers." Implemented.
3. Add a visible Share/Share Post action from seller My Listings cards. Implemented as a `Share Post` action using the existing share-post modal.
4. Add "Share again" next to seller view stats when a listing has views. Implemented.
5. Ask buyers for Messenger/contact info before sending a request if their profile has no Messenger username. Implemented as an optional prompt.

### Implementation Notes

- Logged-out listing detail actions now use stronger marketplace CTAs and return to the current listing through `/auth/sign-in?next=...`.
- Offer/order/donation success states now point buyers to Profile > Sent Offers.
- Buyer offer/order/donation modals include an optional Messenger prompt when the buyer has no Messenger username.
- The offer modal keeps the request as the primary path and treats Messenger as a coordination signal, not the main conversion action.
- Seller-owned listing cards use the action slot for `Share Post`, while the existing image overlay remains the quick copy-link action.
- Profile > My Listings shows a compact "Share again" nudge when listings have views.

### Remaining After First Fix Pass

- Measure whether logged-out CTAs increase sign-in and offer starts.
- Decide whether seller cards should later expose "Share Post" directly, or whether linking to detail remains enough.
- Decide whether Messenger should become required for sellers if non-Messenger listings underperform.
- Review mobile screenshots for card height, modal density, and whether the buyer contact prompt feels helpful or heavy.
- Continue with Run 2: Buyer Friction Audit.

## Psychology Notes To Revisit

- Does the dark, high-contrast style feel premium and focused, or too heavy for casual first-time buyers?
- Are teal CTAs consistent enough that users learn what is primary?
- Are there too many small pills and badges competing for attention on cards?
- Does the card hierarchy quickly answer: what shoe, size, condition, price, trust, next action?
- Is the font weight too dense in compact mobile cards, making scanning harder?
- Do modals feel like a natural marketplace checkout/request pattern, or do they interrupt confidence?
- Does sharing feel like a seller growth tool, or like extra work after listing?
- Does the lack of in-app messaging feel normal for a local Facebook/Messenger-driven marketplace, or incomplete?

## Open Questions

- Which action matters most on listing cards for logged-out users: save, sign in, or open details?
- Should Messenger be shown before or after Send Offer for buyers?
- Should sellers be required to add Messenger, or should it stay strongly recommended?
- Should the post-publish share prompt become a checklist: copy link, share post, share to FB group?
- What metric should define success for Save Pair: saves per listing view, return visits, or eventual offers?
