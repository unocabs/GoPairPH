# Price estimator review and premium launch plan

Prepared November 1, 2026. Implementation update: the v2 free beta, feedback/admin review, source maintenance workflow and gated manual-payment plans are implemented locally. Paid launch, automatic collection and production deployment remain disabled pending genuine validation and configuration. See [implementation and manual setup](price-estimator-implementation.md). The phases below remain the launch evidence requirements; code completion does not mean those gates passed.

## Product decision

Build a defensible pricing tool before charging for additional estimates. The approved pricing direction is:

| Access | Price | Intended behavior |
| --- | --- | --- |
| First estimate | Free, once per account | One complete result for one shoe, with explanations and reasonable corrections. No deliberately weakened estimate. |
| Monthly | ₱50/month | Unlimited personal estimates, saved history, and comparisons during the paid period. |
| Permanent | ₱600 once | The same estimator benefits, attached permanently to the purchasing account, with no scheduled expiry. |

User clarification: automatic monthly renewal is optional. Use it if the merchant supports it and the integration is economical; otherwise manually renewed monthly payment is accepted. Monthly internet price research is a requested conditional enhancement: include it when a maintainable, permitted source collection method is feasible, with a manual reference-data fallback when automation is not.

₱600 equals twelve ₱50 monthly payments; it is **not an annual plan**. Permanent access must not quietly become a yearly renewal. Before sale, state that access lasts for the operating life of the estimator service, define included features, and explain service discontinuation and refund handling. This wording must be visible before checkout. Do not invent a limited founder allocation or an expiry date for the offer.

The review must establish whether the product has enough repeat value for these prices. They are the product direction, not evidence of willingness to pay. Keep the estimator free during research and calibration; enable both paid plans only after the launch gates below pass.

## Initial findings from the current implementation

These are source-code findings, not a completed audit of production data or measured pricing accuracy.

| Finding | Why it matters | Review action |
| --- | --- | --- |
| `runningShoePriceGuide.ts` takes retail price and generic adjustment inputs; brand and model collected by the form are not passed into the engine. | Two unrelated shoes with identical inputs receive identical estimates. | Add canonical model identity and test model-specific evidence before adding brand multipliers. |
| Demand is selected by the seller as popular, normal, or niche. | Users can raise an estimate without independent market evidence. | Distinguish seller opinion from measured demand; remove unsupported demand premiums. |
| Confidence is medium for unknown mileage, otherwise high when a receipt or box exists; low is never returned. | Packaging can produce high confidence without any comparable sales. | Replace this with evidence quality, recency, match quality, and uncertainty. |
| The form computes a separate 12–96 sellability score, including seller urgency, and labels results with phrases such as “Strong chance to sell.” | It resembles a measured probability without outcome calibration. | Remove predictive wording and the numeric score until validated. Keep descriptive listing-quality advice separately. |
| Age labels combine release freshness, ownership age, and shoe age. | These are different depreciation factors. | Separate model release/generation, purchase date, and actual use where known. |
| Condition, mileage, age, and flaws are additive deductions. | Correlated inputs may count the same wear several times. | Measure interactions and double counting; fit only adjustments supported by data. |
| The fast-sale result is 90% of the adjusted lower range, while sell-fast urgency already reduces that range. | Seller urgency changes the estimated value, and discounts can compound. | Calculate one market baseline, then derive clearly explained asking strategies. |
| Rounding uses a ₱100 floor and a minimum ₱100 interval. | Clamping and rounding may distort low-value shoes and apparent precision. | Test boundaries and adapt rounding to price and uncertainty. |
| `greatDeal.ts` uses listing creation time as the age input. | A newly posted old shoe can receive a young-shoe adjustment. | Require a real age source or explicitly treat age as unknown. |
| Great Deal badges and buyback quotes call the same engine. | An estimator upgrade can change public badges and cash quotes. | Version the engine; isolate and separately approve downstream changes. |
| Saved estimator details currently go into local storage and listing descriptions. | There is no durable account history or structured pricing dataset for all these inputs. | Add versioned estimate snapshots and structured fields with explicit provenance. |
| `price_estimate_generated` fires when the wizard starts. | It does not establish a completed, useful estimate or repeat-shoe demand. | Add completion, distinct-shoe, and follow-through events. |
| Marketplace completion is a seller action; request records contain listed and offered prices. | Completed status is not provider-confirmed payment, and an offered price is not automatically the final amount paid. | Audit transaction provenance before treating any row as a sold-price comparable. |
| Calculation currently runs in the browser. | A browser-only gate would not enforce premium access. | Run the paid calculation and entitlement checks on the server. |

Relevant existing files: `src/lib/pricing/runningShoePriceGuide.ts`, `src/components/pricing/PriceGuideForm.tsx`, `src/app/price-guide/page.tsx`, `src/lib/pricing/greatDeal.ts`, `src/lib/pricing/buyback.ts`, `src/lib/pricing/priceGuidePrefill.ts`, `src/types/index.ts`, and `supabase/migrations/056_marketplace_chat_offers.sql`.

## Phase 1 — Establish the baseline and data truth

The user accepted provisional research anchors of ₱4,500 for an original Adizero Evo SL, ₱4,300 for a Novablast 5, and ₱2,900 for a Pegasus 41, using 20 km, Good condition, receipt/box, purchase within a year, no damage/repairs, and common-size assumptions. These were manual judgments from dated retail observations, not verified resale transactions or a passed accuracy benchmark. Preserve their source/variant limitations during evaluation.

The requested feedback loop requires Too low / Too high and a suggested peso amount, with an optional explanation. Collate it in Admin → Feedback and notify admins by email, retaining the exact input/result/version being reviewed. Implementation and validation are documented in [feedback rollout](price-feedback-rollout.md). Treat opinions as feedback; do not automatically refit the engine from them or label them as sale outcomes.

### Review scope

1. Trace every calculator entry, wizard state, result, listing handoff, and downstream engine consumer. Record input defaults and every claim shown to users.
2. Build a reproducible baseline harness using the current version, with fixed reference time and frozen inputs. Preserve outputs before adjusting the model.
3. Produce a data inventory using bounded, read-only queries in an authorized environment. Count usable records by model/generation, condition, size system, date, seller, sale channel, stock mode, and provenance. This plan does not assume production database access or a sufficient sales sample.
4. Audit missing fields, duplicates, copied model names, stale asking prices, misclassified shoes, implausible SRPs, cancelled transactions, donations, and multi-stock sales. Distinguish an individual transaction from a listing marked sold.
5. Measure distinct accounts estimating a second shoe, repeat use within 30 days, and estimator-to-listing conversion. Interview approximately 8–12 runners and repeat sellers about the decisions they need help making. Do not contact users without authorization.

### Evidence hierarchy

Keep these sources separate in storage, model fitting, and result labels:

- Buyer-and-seller-confirmed final sale amount, date, condition, size, and model, with a documented verification method. Go Pair PH currently facilitates direct settlement; do not label these as payment-processor-verified sales.
- Seller-reported completed sales with a confirmed final amount, explicitly labeled as seller reported.
- Completed request amounts whose final payment has not been independently confirmed; lower-confidence outcome evidence.
- Current, legitimate local asking prices; evidence of competition, not proof buyers paid that amount.
- Official PH retail prices and broadly available discounts with source, timestamp, stock/size availability, and shipping context.
- Foreign-market references only as separately labeled context; do not directly convert them into Philippine sold values.
- Formula fallback when stronger evidence is unavailable, prominently labeled as limited evidence.

Capture model identity, condition/mileage, price basis, final amount where actually known, completion date, and provenance at the transaction event. Do not backfill historical final prices from today's listing price. Avoid extracting private chat contents as price evidence. Exclude the price Go Pair PH pays in a buyback from normal consumer resale comparables; qualifying later retail resale outcomes can be assessed separately.

For external data, review source access, permitted reuse, freshness, and licensing before choosing an ingestion method. Public visibility does not establish permission to scrape or republish. No external marketplace integration is assumed in the initial build.

**Deliverables:** source map, data dictionary, missing-data report, frozen baseline, source-access assessment, and a narrow initial coverage list based on actual evidence.

## Phase 2 — Specify the improved pricing method

### Model identity and inputs

- Normalize brand/model aliases and spelling while preserving the submitted text. Match exact generation first. Ask the user to confirm ambiguous matches; never silently substitute a different model.
- Separate road trainers, racing/carbon shoes, trail shoes, and unsupported lifestyle/non-running shoes. Establish category rules using evidence rather than assuming one wear curve fits all shoes.
- Normalize sizes with men's/women's/unisex context and preserve original units. Avoid universal EU-to-US conversions. Use size premiums or discounts only when data supports them.
- Distinguish original SRP, actual purchase price, current official new price, model release age, purchase age, mileage, condition, repairs, and visible defects. Allow unknown values.
- Add contradiction checks such as unused shoes with substantial mileage. Missing receipts do not prove counterfeit goods, and a receipt does not certify authenticity.
- Keep optional fields progressive and brief on mobile. Do not make a detailed valuation questionnaire a prerequisite for creating a listing.

### Pricing pipeline

1. Validate and normalize the shoe and evidence.
2. Establish a current local retail reference from dated, available sources; flag user-entered values that materially disagree. A temporary members-only or unavailable-size discount must not silently become the universal retail ceiling.
3. Retrieve a bounded comparable set, prioritizing exact model/generation and suitable condition, then documented broader fallbacks. Separate sold evidence from asking-price evidence.
4. Deduplicate listings, relists, and images; cap the influence of one seller or shop. Exclude donations, flagged listings, obvious bundles, counterfeits, and inappropriate buyback acquisition prices.
5. Use a robust, explainable baseline such as a recency-weighted median or regularized hierarchical estimate. Compare candidate methods against simple alternatives before adopting complexity. Document outlier handling and effective independent sample size.
6. Apply supported adjustments for wear, age, condition, size, and local context. Reduce adjustment strength with sparse evidence. Do not add arbitrary brand prestige multipliers or learn demand directly from seller selections.
7. Derive an uncertainty range from held-out residuals and evidence dispersion; increase uncertainty for unknown inputs and weak matches. Do not label an uncalibrated range as a statistical confidence interval.
8. Derive conservative, balanced, and patient asking strategies from that common baseline. Explain tradeoffs; do not promise sale dates or probabilities without outcome validation.
9. Attach engine version, evidence cutoff, comparable IDs/versions, source types, excluded-data reasons, and the retail reference to a reproducible result snapshot.

Treat views, saves, offers, exposure, and time on market as noisy auxiliary evidence. Correct for promoted placement, listing completeness, stale availability, seasonality, and seller differences before attributing these to demand. Unsold active listings are censored observations, not failed sales at their asking prices. Listings priced using Go Pair PH are affected by the estimator itself; track that exposure to avoid circular validation.

**Deliverables:** written pricing specification, comparable-selection rules, uncertainty policy, fallback policy, model coverage rules, and versioned output contract.

## Phase 2A — Monthly internet price refresh and asking-price assessment

### Feasibility finding and boundaries

A maintained monthly retail reference catalogue is technically feasible. Spot checks found readable model names, Philippine-peso prices, and discounts on official Nike PH and ASICS PH pages. The site already maintains an official-brand-links page that can seed source discovery. This establishes that useful reference information exists; it does not establish that every brand permits automated collection, that indexed prices are live, or that all sizes are available. Review each source before choosing the collection method.

Start with the most-used models established in Phase 1 rather than attempting all brands and every historical shoe. The existing New Balance US and HOKA Australia links are foreign references, not Philippine retail observations. Keep them separate unless suitable local sources are found. Official retail data improves the new-shoe reference; condition-adjusted resale value still requires the separate resale method and validation described above.

### Source and refresh design

1. Maintain an allowlisted source registry with brand/retailer, region, currency, permitted collection/reuse method, product identifiers, parser version, refresh policy, and last successful review. Prefer documented APIs, licensed feeds, retailer-provided exports, or permitted structured product data. Do not rely on snippets from a search result as the authoritative price record.
2. For each exact model/generation/variant, record source URL, listed regular price, offered price, currency, market, eligibility conditions, available sizes when verifiable, shipping context, source observation time, fetch time, and any stated sale end date. Unknown availability stays unknown. Never assume a rendered size selector establishes in-stock availability.
3. Run a bounded backend refresh once per calendar month using a production scheduler selected during implementation. Schedule the first day of the month in Asia/Manila as the initial proposal; make runs restartable with stable per-source/model/month identities, batching, timeouts, retry/backoff, and source-respecting request rates. Do not schedule a chat automation or enable a production job as part of editing this plan.
4. Fetch once for the catalogue and share validated public references across estimates. Do not browse the internet or incur an AI/search charge for every user estimate. Prefer fetching known model URLs and discovering new sources in a separate bounded process.
5. Stage each observation before publication. Validate currency, region, model identity, generation, plausible positive price, discount arithmetic, and duplicate products. Route ambiguous model matches and large unexplained movements to admin review. Prevent missing fields, empty responses, or parser errors from becoming a zero-price record or wiping the catalogue.
6. Publish validated updates atomically per product/reference group. Persist historical snapshots and provenance; do not overwrite the evidence attached to past user estimates. Partial job failure must leave valid products usable and expose source-level failure/freshness status.
7. Respect authentication/access restrictions and source limits. If automated access is disallowed or unreliable, use authorized feeds or an admin-assisted monthly import with source links and dated review. If no dependable route exists, omit that source or automated coverage; do not make the whole estimator or its purchase flow depend on it.

### Monthly does not mean live

Display “Price reference checked [date]” and its source rather than “live price.” A monthly observation can miss a short sale. Disqualify known-expired offers immediately, even if the monthly refresh has not run. Proposed default: observations older than 35 days are stale and must not produce a confident “current cheapest new price” claim. Tune that threshold using the source's update frequency and sale behavior; references can become unreliable earlier.

If only stale data remains, retain it as dated context, reduce confidence, offer the source link for checking, and use the documented fallback. If the user's model is not covered, explain that explicitly. Never fill a missing market price with an invented value or claim that monthly collection guarantees availability at the displayed price.

### Assess whether the seller's price is justified

Add an optional **“Your asking price”** input after the shoe details. Compare it against the condition-adjusted resale range and the best qualifying same-model new-retail reference. The assessment should explain:

- Whether the asking price is below, within, or above the supported resale range, accounting for uncertainty and rounding tolerance.
- How much cheaper it is than a qualifying new option, with matching model, market, and availability limitations stated.
- Which details support the price, such as low mileage or strong condition, and which weaken it, such as outsole wear, repairs, missing usage details, or a current official discount.
- A specific alternative asking range or a request for missing information. Avoid an unconditional “overpriced” verdict when evidence is sparse.

Use clear labels such as **“Within the suggested range,” “Above the supported range,”** or **“Not enough evidence to assess.”** Keep “likely to sell quickly,” “best deal,” and numeric sale probabilities out of this feature until supported by outcomes. Receipts and photos support confidence in details; they do not prove authenticity or guarantee a sale.

Illustrative explanation using fictional numbers, not a current product valuation: “You entered ₱5,500. The condition-adjusted range is ₱4,300–₱4,900. A qualifying new option was observed at ₱6,000 on [date], so the small discount from new may make your price harder to justify. Consider the suggested range or add the missing usage details.”

Do not double-count a retail discount and a model-depreciation adjustment that already reflects it. Distinguish the seller's desired price from the model's evidence; entering a higher price must not raise the recommended market value. A public seller-facing assessment is guidance, not permission to automatically change a listing or assign a public negative badge.

### Acceptance and rollout

- Pilot with a small, representative model catalogue and at least two refresh cycles, including a simulated interrupted run. Measure exact-model match accuracy, price extraction accuracy against manual source review, freshness coverage, per-run cost, and admin review effort.
- Reject wrong-model, wrong-currency, expired-offer, and unsupported availability claims in test fixtures. Verify sale-to-regular-price transitions, sold-out sizes, removed products, changed markup, overlapping source updates, and duplicate runs.
- Make paid coverage visible before checkout. Automated refresh is conditional on feasibility; do not sell a promise of all-market coverage. If manual maintenance is the viable solution, disclose the actual update cadence and support only that coverage.
- Integrate reference snapshots into Phase 3 backtesting without future-data leakage. Evaluate whether refreshed prices actually improve accuracy over the no-refresh baseline.

**Deliverables:** source feasibility matrix, pilot model catalogue, observation schema, monthly refresh/import design, admin review flow, asking-price assessment specification, cost report, and a documented automate/manual/omit decision per source.

## Phase 3 — Prove the method improves decisions

Use two distinct evaluation sets: synthetic scenarios for correctness and real independent outcomes for accuracy. Synthetic cases cannot establish market accuracy.

### Correctness and regression checks

- Cover new through fair condition; unknown, high, and zero mileage; release age versus ownership age; missing proof; repaired shoes; discontinued models; large retail discounts; rare sizes; and unsupported models.
- Test invalid, extreme, and boundary inputs, currency units, future dates, rounding, and all clamp limits.
- Holding other inputs and evidence fixed, increased wear must not increase estimated value. Better proof must not manufacture certainty about market price.
- Unknown models must use an honest fallback or decline to give a defensible price. Similar inputs must produce stable results against the same evidence snapshot.
- Compare Great Deal and buyback outputs before and after. Preserve current commercial buyback behavior until that separate pricing change is explicitly reviewed.

### Accuracy and calibration

- Freeze evidence as it would have existed at estimate time. Split chronologically and group by shoe/listing/seller to avoid relist leakage. The target sale itself must never appear among its own comparables.
- Compare the current engine, a simple retail-depreciation baseline, and a comparable-price baseline with the proposed engine.
- Measure median absolute percentage error and peso error; report tail errors and signed over/underpricing. Report results by supported category and evidence tier, not only one aggregate.
- Measure interval coverage alongside interval width. A range that contains almost every price because it is extremely wide is not useful.
- Assess the effect of incomplete inputs, seller-reported outcomes, duplicated stock, inflated asking prices, and sparse exact-model data.
- Use price changes and actual sale outcomes for follow-up. Do not infer that a lower estimate caused a faster sale without accounting for exposure, seller actions, and unsold shoes.

### Proposed launch gates

These are review targets to validate against available data, not achieved results or advertised guarantees:

| Gate | Proposed requirement |
| --- | --- |
| Minimum evidence | Begin with at least 50 independently usable historical local sale outcomes across the declared launch scope, plus 30–50 synthetic boundary scenarios. Fifty outcomes are an initial evaluation floor, not enough to claim accuracy for every model. Use subgroup uncertainty to narrow supported coverage. |
| Improvement | Aim for at least 20% lower median percentage error than the current engine on the frozen holdout, with no material tail-error regression. Require practical peso-error improvement and inspect uncertainty before accepting this threshold. |
| Useful ranges | Set and freeze a target coverage and width policy using a calibration set before final holdout evaluation. Publish descriptive evidence labels until statistical coverage is established. |
| Honesty | Every result exposes its source tier, freshness, confidence limitations, and asking-versus-sold distinction. Unsupported shoes do not get confident-looking results. |
| User value | Pilot users can explain the recommendation and identify a useful pricing action. Observe real repeat-shoe demand and disclosed-price purchase interest. |
| Regression safety | No unexplained change to buyback quotes, Great Deal badges, or the listing handoff. |

If usable outcomes are insufficient or the new engine does not beat simple baselines, continue a free research beta. Do not solve weak evidence by relabeling a formula as AI or hiding uncertainty behind the paywall.

**Deliverables:** benchmark dataset documentation, evaluation report, failure catalogue, explicit launch/no-launch recommendation, and limitations by coverage group.

## Phase 4 — Build the premium experience

The free first result must demonstrate the actual product. Paid value comes from repeat decisions, history, and comparisons.

### Result content

- Suggested asking range and clearly distinguished asking strategies.
- Comparable evidence with count, recency, match quality, and asking/sold labels. Show source links where permitted and avoid exposing private transaction details.
- Current retail comparison and an explanation of the most important adjustments.
- Optional asking-price assessment against condition-adjusted resale evidence and dated new-retail references, with concrete reasons and alternatives.
- Honest confidence and missing-information guidance.
- Save, compare, and carry details into a free listing. Preserve the ability to choose a different asking price.

### Trial and access rules

1. Explain the one-free-estimate allowance before starting. Allow anonymous drafting; require sign-in before revealing and durably saving the first complete account result. Preserve inputs through sign-in.
2. Redeem the trial atomically only when a valid full result is saved and available to the account. Retries, duplicate requests, network failures, and simultaneous tabs must not consume multiple trials or reveal multiple free shoe results.
3. Allow reasonable corrections and scenario adjustments for the first shoe during its estimate flow. Define identity-changing edits and later fresh market recalculation explicitly; switching models must not silently create a free second estimate.
4. Reopening the saved first result is always free. If a shoe is unsupported and no useful result can be produced, preserve the trial.
5. Show the paid gate before collecting the second shoe's full details. Retain its draft if checkout fails or the user declines. Always provide a route to list shoes without an estimate.
6. Monthly and permanent buyers get identical unlimited personal-use calculation features, account history, and side-by-side comparisons. No hidden monthly estimate quota on the permanent plan. Apply reasonable technical rate limits to protect availability, clearly distinct from a product usage cap; do not claim an API or bulk data resale license is included.
7. After monthly expiry, retain access to the account's previously saved snapshots and export. New paid calculations and fresh market updates require renewed access. Show saved result dates so old snapshots do not appear current.
8. Define model/data freshness separately from account access. Saved results remain reproducible; new calculations use the current engine and show what changed.

Suggested paywall: “Price more running shoes” with **₱50 monthly** and **₱600 permanent · one-time payment**. Describe billing and cancellation plainly. Do not preselect the more expensive plan or show invented savings, buyer counts, scarcity, or sale guarantees.

**Deliverables:** mobile flow, result design, saved-estimate/history design, comparison design, plan copy, trial rules, and pilot feedback.

## Phase 5 — Payments, account entitlements, and economics

### Monthly billing decision

The requested product is ₱50/month. The user accepts manual monthly payment if automatic renewal is unavailable. Investigate merchant-supported recurring billing first, then use manual renewal without making recurring capability a launch blocker. Do not silently turn it into an auto-renewing charge or mislabel manual access as automatic billing.

- Existing QR Ph hosted checkout can support a manually renewed monthly access product. This is an accepted fallback if recurring billing is unavailable or unsuitable at ₱50. Clearly disclose manual renewal, use one calendar month per verified purchase, and show the exact expiry before purchase. Define month-end clamping and extension from the later of now/current expiry; store UTC timestamps and display dates in Asia/Manila. Manual payment means the user initiates checkout; payment verification and account activation should still be automatic after confirmed payment.
- Automatic monthly subscriptions require a separate integration and enabled merchant capability. PayMongo's current documentation lists Visa/Mastercard and Maya for subscriptions, rather than QR Ph. Confirm merchant eligibility, provider behavior, cancellation, outstanding invoices, and payment economics before choosing auto-renewal.
- If automatic renewal is selected, require explicit renewal consent and straightforward cancellation; retain access through the paid period when cancellation does not involve a refund. Never claim that the existing promotion checkout already provides subscriptions.

### Entitlement and payment design

- Use a server-authoritative estimator entitlement distinct from verification, promotions, and GP Coins. Verification is not a prerequisite for this purchase. GP Coin redemption is outside the initial estimator plans.
- Plan durable records for products/prices, estimate snapshots, trial redemption, payments, entitlement grants, billing periods, refunds, and provider events. Record immutable purchased terms and exact centavo amounts: 5,000 monthly or 60,000 permanent.
- Reuse existing provider transport, signature verification, and reconciliation patterns where suitable, but do not reuse promotion placement fulfillment or listing-dependent orders for subscriptions.
- Validate product, account, amount, currency, environment, and provider payment state server-side. Grant access exactly once after verified payment; a return URL or browser flag cannot grant premium.
- Handle delayed/duplicate/out-of-order webhooks, abandoned or unresolved checkout creation, missing events, failed renewal, refunds, disputes, overlapping grants, and account ownership. Continue reconciliation when new purchases are disabled.
- Permanent entitlement has no expiry and takes precedence. Block redundant monthly purchases for permanent owners. For monthly-to-permanent upgrades, disclose the treatment of the current paid period. Safely stop future recurring billing if enabled; resolve outstanding invoices before promising no further charge. Never remove a permanent grant because an unrelated monthly grant expires or is refunded.
- Define whether past monthly payments earn upgrade credit; default proposal is no automatic credit, disclosed before buying permanent access. Do not retrospectively change purchased access terms.
- Enforce account ownership with RLS and authenticated server endpoints. Keep underlying private comparables out of browser payloads and premium engine/data credentials out of the client bundle. Protect expensive queries without blocking normal comparison use.

### Cost review

Calculate actual per-payment fees, refund/support cost, data-refresh expense, database/storage cost, and expected usage for median and heavy accounts. Model monthly retention and permanent usage over 1, 3, and 5 years. Do not treat permanent revenue as recurring revenue or assume twelve months is its cost horizon.

PayMongo's published standard fees currently include QR Ph at 1.34%, Maya at 1.79%, and local cards at 3.125% + ₱13.39, excluding VAT. Including 12% VAT on fees, illustrative net proceeds from ₱50 are approximately ₱49.25 via standard QR Ph, ₱49.00 via Maya, and ₱33.25 via local card. These exclude other applicable costs and merchant-specific pricing; verify subscription pricing and capabilities directly. This is a reason to evaluate payment method economics, not permission to add undisclosed fees.

Permanent access must remain economical without a paid external API or LLM call for every adjustment. Prefer maintained reference data, cached evidence, and deterministic calculations; use AI only for a measured, necessary task with bounded costs. Any future separately charged product must be clearly outside the features sold under permanent access.

**Deliverables:** billing decision, payment/entitlement state diagram, lifecycle test matrix, purchase terms, permanent-plan cost model, and rollout/rollback plan.

## Phase 6 — Mobile performance, validation, and controlled launch

### Mobile and performance acceptance

- Test narrow screens from 320–430 px, larger screens, keyboard interaction, zoom, slow connections, and interrupted sessions. Preserve drafts, provide meaningful loading/error states, and keep plan selection and totals readable.
- Keep form interaction local and instant; request server estimates on explicit completion or a debounced deliberate update, not every keystroke. Use cancellation and request identity to avoid stale results.
- Normalize/index comparable lookup keys. Precompute bounded evidence summaries, cache public market reference data by model and freshness window, and avoid marketplace-wide scans or one query per displayed comparable.
- Never share private estimate/history caches across accounts. Cached calculations must not bypass fresh entitlement checks.
- Proposed performance targets: p95 warm estimate response under 1 second against representative data, and mobile p75 LCP at most 2.5 seconds, INP at most 200 ms, CLS at most 0.1. Establish current baselines, record device/network conditions, and investigate material regressions. Do not add heavy charting or AI SDKs for simple result displays.

### Verification

Add meaningful engine/property tests, comparable-selection tests, trial/entitlement concurrency tests, and real local-database RLS/payment state tests. Cover expiry boundaries, duplicate webhook delivery, refunds with overlapping grants, failed checkout recovery, permanent access, and monthly cancellation/upgrade behavior. Verify the same-phone payment flow in provider test mode. Run the project's relevant test, lint, and build checks after implementation; a documentation-only plan does not need an application test run.

### Pilot and release

1. Complete the audit and calibration before adding the paywall.
2. Run the improved engine in shadow mode with frozen evidence and explicit exclusions; compare against the existing outputs without changing buyback commitments.
3. Run a free invited beta with consented outcome feedback. Publish supported coverage and limitations.
4. Once the data, accuracy, UX, entitlement, payment, and cost gates pass, offer the one-free-estimate, ₱50 monthly, and ₱600 permanent plans to a limited rollout cohort. Show the real prices and features; do not advertise a working premium product before it exists.
5. Monitor distinct completed estimates, second-shoe attempts, trial-to-paid conversion by plan, monthly renewals, permanent purchases, refunds, p95 latency, cost per active account, pricing error, and new-listing conversion. Define funnel denominators and exclude staff/tests/bots.
6. Compare listing conversion and repeat use against a stable pre-paywall baseline or a small holdout. With low traffic, report sample sizes and uncertainty rather than claiming statistically proven lift.
7. Pause new sales if billing integrity fails, useful coverage falls, or the plan's promised features cannot be delivered. Preserve paid entitlements and saved results; disabling new checkout is not a license to revoke permanent access. Handle service incidents and refunds under the published terms.

Analytics must distinguish wizard start from completed unique-shoe results, same-shoe edits, saved-result views, fresh recalculations, paywall impressions, checkout creation, verified payment, entitlement activation, and listing publication. Keep social proofs, payment details, and private transaction contents out of analytics events.

**Deliverables:** completed QA evidence, pilot report, live monitoring, support guidance, and a final release decision.

## Recommended work order and completion criteria

| Order | Work package | Completion evidence |
| --- | --- | --- |
| 1 | Source audit and production-data feasibility | Data truth report, dependency map, baseline harness, coverage proposal |
| 2 | Outcome capture and model/reference normalization | Provenance-aware data model and sufficiently usable calibration/evaluation samples |
| 3 | Pricing method and uncertainty | Versioned specification and evidence-backed prototype |
| 3A | Monthly public-price references and asking-price assessment | Per-source feasibility decision, validated refresh/import pilot, dated references, and tested condition-based explanations |
| 4 | Backtesting and downstream review | Accuracy report, failure review, separate buyback/Great Deal decision |
| 5 | Result, history, comparison, and free-trial experience | Mobile beta demonstrates useful repeat decisions |
| 6 | Monthly/permanent payments and entitlements | Provider capability confirmed; cost model, lifecycle tests, and terms complete |
| 7 | Controlled paid launch | All gates pass and monitoring/support are ready |

Sequence work by these dependencies rather than promising a launch date before data availability is known. External data licensing, outcome collection, and merchant activation may determine the schedule. The first implementation milestone should be a reviewed data/logic audit and baseline test harness, not a checkout button.

Future schema changes will require migration files, but none are created by this plan. **This project does not auto-apply migrations to Supabase.** The eventual rollout must name the exact new migration files and instruct the operator to run them manually in the Supabase SQL Editor before dependent code is enabled. Never instruct users to apply a migration number that has not been created.

## References reviewed

- [Current Go Pair PH estimator and its methodology disclosure](https://gopairph.com/price-guide).
- [PayMongo subscription capabilities and activation](https://docs.paymongo.com/docs/payment-acceptance-subscriptions): supported methods, merchant enablement, billing/cancellation behavior. Reviewed November 1, 2026; recheck during implementation.
- [PayMongo published pricing](https://www.paymongo.com/en/pricing): payment method fees and VAT treatment. Merchant rates may differ.
- [eBay Product Research](https://www.ebay.com/help/selling/selling-tools/product-research?id=4853): reference for distinguishing actual sold prices, including accepted offers, from asking prices. This is product research context, not an approved data feed or a claim of Philippine comparability.
- [Nike PH Pegasus catalogue](https://www.nike.com/ph/w/pegasus-1n3adz47w4rz8nexh) and [ASICS PH Novablast 5 product page](https://www.asics.com/ph/en-ph/novablast-5/p/1011B974-750.html): feasibility spot checks for public model, regular-price, and discount references. Source access permissions and real-time variant availability remain to be validated before an automated collector is adopted.
- Existing local payment architecture and rollout: `docs/paymongo-promotion-rollout.md`, `src/lib/payments/`, and `src/app/api/promotions/checkout/route.ts`.
