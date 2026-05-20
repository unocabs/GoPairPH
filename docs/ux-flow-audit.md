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

- Buyer can browse marketplace.
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
- Continue with Run 3: Seller Friction Audit.

## Run 2: Buyer Friction Audit

Status: first fixes implemented

Checked: May 20, 2026

### Scope Checked

- Logged-out browse cards.
- Logged-out listing detail page.
- Detail-page sign-in return URLs.
- Save Pair behavior.
- Offer/order/donation modal structure from code and recent QA.
- Post-submit success state.
- Buyer trust signals: seller identity, verification, Messenger/contact, safety notes, and status messaging.
- Mobile-first risks: action density, scroll distance, button clarity, and modal height.

### What Feels Stronger After Run 1

- Detail pages now give logged-out buyers clear primary actions: "Sign in to Send Offer", "Sign in to Place Order", "Sign in to Request Donation", and "Sign in to Save Pair".
- Detail-page sign-in links preserve the listing return path through `/auth/sign-in?next=...`, which should reduce post-login disorientation.
- Buyer success states now tell users to track requests in Sent Offers and include a direct link.
- Messenger is framed as coordination after a Go Pair PH request instead of the main conversion path.
- Seller identity and verification are visible near the buyer decision point.
- The modal layering fix makes the request modal feel like the active frontmost task instead of something trapped inside the detail layout.

### Top Buyer Friction Findings

1. Logged-out save buttons on browse cards are visible but disabled.
   - Buyer moment: a new visitor taps the heart/save icon while scanning.
   - Risk: a disabled control feels like the site is broken or unavailable, especially on mobile where icon-only controls carry less explanation.
   - Likely fix: keep the compact icon, but make it a sign-in link with `next` set to that listing or current browse URL. Do not add a heavy card CTA.

2. Buyer action language is not fully consistent.
   - Buyer moment: card says "Send Offer", detail says "Sign in to Send Offer", modal says "Request to Buy", submit says "Send Purchase Request", and success says "Request sent".
   - Risk: each label is understandable alone, but the mental model shifts from offer to request to purchase. That can add hesitation right before submission.
   - Likely fix: choose one vocabulary family per listing type. For community for-sale listings, prefer "Send Offer" when negotiable and "Request to Buy" when fixed price; keep the modal title and submit button aligned.

3. The buyer contact prompt may look like a required step.
   - Buyer moment: a signed-in buyer without Messenger opens the offer/order/donation modal.
   - Risk: the prompt has "Add Messenger" and "Continue", which can make the buyer think they must choose before sending even though the form can proceed without it.
   - Likely fix: make it visibly optional and lighter. Consider "Add Messenger (optional)" plus "Skip" or a collapsed inline prompt so the primary submit action remains the obvious next step.

4. Request modals are trustworthy but text-heavy.
   - Buyer moment: the buyer wants to send a quick request from mobile.
   - Risk: seller card, coordination note, Messenger prompt, message box, and safety copy can push the final submit button far down. Too much explanation at the decision point can feel like friction.
   - Likely fix: keep the trust content, but compress it. Use short bullets or one-line helper copy, and move deeper safety guidance behind a link.

5. Public share actions on the detail page can compete with buyer intent.
   - Buyer moment: logged-out buyer sees seller/contact/share area before the primary sign-in offer CTA.
   - Risk: "Copy & Share Link" and "Share Post" are useful, but they may distract from the buyer's main job: save, sign in, or send an offer.
   - Likely fix: keep sharing available, but visually subordinate it for non-owners. The strongest visible action should remain the transaction CTA.

6. "Seller has not added Messenger" warning can reduce confidence before the buyer has acted.
   - Buyer moment: buyer likes a listing but sees an amber warning above the sign-in/send-offer CTA.
   - Risk: the message is honest, but the color and placement can subconsciously read as danger or poor seller quality.
   - Likely fix: soften the tone and placement. Example: "Go Pair PH request available. Add your contact in the message so the seller can reply from their profile."

7. Saved Pairs has value, but the browse-card save flow does not explain the payoff.
   - Buyer moment: buyer is browsing casually and not ready to send an offer.
   - Risk: Save Pair is the lower-commitment conversion, but icon-only save has low perceived value for new users.
   - Likely fix: keep cards compact, but on first sign-in/save success, show a small toast like "Saved. Find it in Profile > Saved Pairs."

### Psychological Notes

- The site already feels more marketplace-like because prices, condition, size, verification, and seller identity are close to the action.
- Teal is working as the primary action color, but too many teal borders/badges can make secondary elements feel equally important.
- Amber warnings should be used carefully. On buyer paths, amber can trigger "something is wrong" even when the message is only informational.
- Button labels should reduce risk in the buyer's head. "Request" feels safer than "Buy" when payment is not happening on-site; "Offer" feels right when price is negotiable.
- For mobile users, the best conversion path is usually one clear next action per screen section. Extra trust content should support that action, not compete with it.
- Familiarity matters: the flow should feel like Facebook Marketplace plus a clearer request tracker, not like a checkout form with too many obligations.

### Recommended Run 2 Fix Order

1. Make logged-out card save icons route to sign-in instead of being disabled. Implemented.
2. Standardize buyer action labels across cards, detail pages, modals, submit buttons, and success states. Implemented for for-sale buyer CTAs.
3. Lighten the optional Messenger prompt so it cannot be mistaken for a required step. Implemented.
4. Compress modal trust/safety copy for mobile while keeping the safety link available. Implemented.
5. Subordinate non-owner share actions on listing detail pages below buyer CTAs.
6. Soften no-Messenger seller messaging so it reassures instead of warning. Implemented.

### Run 2 Implementation Notes

- Logged-out save icons on listing cards now route to sign-in instead of rendering as disabled controls.
- Card save sign-in links return buyers to the specific listing they tried to save, preserving item intent.
- For-sale buyer CTAs now distinguish negotiable and fixed-price intent more consistently:
  - negotiable community listings use "Send Offer";
  - fixed-price community listings use "Request to Buy";
  - shop listings continue to use "Place Order".
- Offer/request modal titles, submit buttons, helper text, and success states now follow the same action language.
- Optional buyer Messenger prompt is now visually lighter, explicitly optional, and uses "Add" / "Skip" instead of a heavier two-choice gate.
- Offer/order/donation modal trust copy is shorter on mobile while preserving the safety guide link for shop orders.
- No-Messenger seller messaging now uses neutral reassurance instead of an amber warning treatment.

### Run 2 Open Questions

- Should a logged-out card save return to the exact listing, or back to the browse page the buyer came from?
- For fixed-price community listings, should the primary action say "Request to Buy" instead of "Send Offer"?
- Should "Share Post" be seller-only on detail pages, while buyers only get copy/share link?
- Should the optional Messenger prompt appear only after the buyer starts typing a message, or remain near the seller trust area?

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
