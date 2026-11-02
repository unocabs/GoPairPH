import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms for using Go Pair PH as a buyer, seller, shop seller, or visitor of the running shoe marketplace.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service" lastUpdated="November 2026">
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Acceptance of terms</h2>
        <p>
          By accessing or using Go Pair PH (&quot;the site&quot;, &quot;we&quot;,
          &quot;us&quot;), you agree to these Terms of Service. If you do not agree, please
          do not use the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Eligibility</h2>
        <p>
          You must be at least 18 years old to create an account. You agree to provide
          accurate information about yourself, your shop if applicable, and your listings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. What Go Pair PH is (and isn&apos;t)</h2>
        <p>
          Go Pair PH is a <strong>listing and shop storefront platform</strong>. We connect buyers
          with community sellers and independent shop sellers. Payments for shoes are arranged directly between buyers and sellers. We do not
          hold inventory, ship items, inspect shoes, verify authenticity, provide escrow, or
          guarantee the conduct of any user or shop. Go Pair PH collects its own promotion fees through PayMongo QR Ph checkout.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. User responsibilities</h2>
        <p>You agree to:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Describe items honestly, including brand, model, size, condition, mileage, price, location, stock, and any defects.</li>
          <li>Use only photos of the actual item you are listing.</li>
          <li>Keep listing, shop, availability, and contact information reasonably updated.</li>
          <li>Honor accepted offers, orders, free-pair requests, and agreed transaction terms in good faith.</li>
          <li>Treat other users with respect — no harassment, hate speech, or threats.</li>
          <li>Comply with all applicable laws when buying, selling, shipping, or meeting up.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Prohibited content & conduct</h2>
        <p>You may not list, post, or facilitate:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Counterfeit or stolen goods.</li>
          <li>Misleading listings, stock photos presented as actual items, unrelated screenshots, or photos that do not clearly show the listed pair.</li>
          <li>Items unrelated to running shoes or approved running shoe marketplace use.</li>
          <li>Spam, fraud, scams, or fake listings.</li>
          <li>Impersonation of another person or business.</li>
          <li>Attempts to manipulate views, saved pairs, offers, demand signals, promotions, or rankings.</li>
          <li>Anything illegal under Philippine law.</li>
        </ul>
        <p>
          We may flag, demote, hide, remove, or edit the visibility of listings, shops,
          posts, or accounts that violate these terms, create safety concerns, appear
          misleading, or reduce marketplace trust.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Transactions between users</h2>
        <p>
          Once a seller accepts an offer, order, or free-pair request, the buyer and seller arrange the
          transaction directly — by meetup, online payment, shipping, or any combination.
          Go Pair PH is not a party to these transactions and is not responsible for
          payment, delivery, item condition, authenticity, warranty, refunds, returns,
          failed meetups, or loss. We strongly encourage following our{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">
            Safety Guide
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">7. Listing status and manual sold actions</h2>
        <p>
          Sellers may mark a pair as sold, claimed, reserved, unavailable, or inactive.
          If a seller marks an item sold or claimed outside Go Pair PH, that status is
          for seller organization and marketplace cleanup only. It does not mean Go Pair PH
          verified the sale, buyer, payment, delivery, or transaction outcome.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">8. Saved pairs, saved searches, Looking For posts, and demand signals</h2>
        <p>
          Features such as Saved Pairs, Saved Searches, Looking For posts, listing views,
          buyer requests, and demand signals are provided to help users organize and
          discover pairs. They do not guarantee availability, seller response, buyer intent,
          accurate matching, or completed sales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">9. Promotions, Top Pick listings, and ranking</h2>
        <p>
          Go Pair PH may offer free or paid visibility features, including Top Pick,
          Featured, or promoted placements. Promotion improves placement or visibility
          according to the current product rules, but it does not guarantee offers, sales,
          traffic, ranking duration beyond the stated window, or buyer behavior. We may
          still lower the priority of promoted listings that lack clear photos, appear
          misleading, have no images, violate rules, or create trust concerns.
          GoPair Coins are promotional credits that may be applied to eligible Featured
          placements and Flash Deals; they are not cash, withdrawable, or transferable.
        </p>
        <p>
          Promotion fees are paid through PayMongo checkout using QR Ph or another enabled payment method. Placements activate or enter the Featured queue only after verified payment.
          A return or cancellation screen does not confirm a payment outcome. If confirmation is delayed, check{' '}
          <Link href="/promotions/payments" className="text-teal-400 hover:text-teal-300">Promotion payments</Link>{' '}
          before trying to pay again. Unused promotion time after shoes sell is not refunded.
          If a paid placement cannot be delivered, contact support with the payment reference for refund review.
          Payment refunds are recorded after PayMongo confirms them; review status alone does not mean funds were returned.
          See the{' '}<Link href="/help/promote-listing" className="text-teal-400 hover:text-teal-300">promotion policy</Link>{' '}for details.
        </p>
      </section>

      <section id="gp-coins" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-gray-100">GP Coin purchases and Flash Deals</h2>
        <p>Verified accounts can buy 40 GP Coins for ₱20, 100 GP Coins for ₱50, or 200 GP Coins for ₱100 through PayMongo. Coins are credited only after verified payment. Bought coins have no scheduled expiry; earned rewards expire after 6 months. Coins are promotional credits for this account, cannot buy shoes, and cannot be transferred or withdrawn. There are no subscriptions or automatic top-ups.</p>
        <p>A Flash Deal costs 20 GP Coins and runs for up to 24 hours. The seller funds a genuine discount of at least 10% from the lowest recorded asking price in the last 7 days. Homepage display rotates; continuous display, buyer inquiries, and sales are not guaranteed. Each account can run one live deal and each listing can join once every 7 days. Changing the price, closing the listing, or making the shoes unavailable ends the deal. Fees are not returned for early cancellation or a quick sale. Failed activation does not spend coins.</p>
        <p>Contact support with your reference for a duplicate, accidental, or disputed coin payment or an undelivered promotion. Refund requests are reviewed and confirmed through PayMongo. Refunded credits are removed and a wallet may be paused if those credits were used or reserved. These rules do not limit applicable consumer rights. <Link href="/help/flash-deals" className="text-teal-300 underline">Read the complete Flash Deal and coin rules.</Link></p>
      </section>

      <section id="estimator" className="scroll-mt-24">
        <h2 className="text-xl font-semibold text-gray-100">Shoe price estimator access</h2>
        <p>While the estimator is in free beta, no paid plan is required. When paid access is enabled, the first full estimate is free once per account, with same-model corrections for 24 hours. Unlimited access costs ₱50 for one calendar month with manual renewal, or ₱600 once for permanent access on the purchasing account for the operating life of this estimator service. Permanent access has no scheduled expiry; it does not promise that the service will operate forever. Payments do not renew automatically.</p>
        <p>Access includes the available estimator, saved estimate history, asking-price guidance, and export. Retail coverage is limited to the models shown before checkout and can require manual maintenance. Estimates are guidance, not guaranteed sale prices, authenticity checks, or promises of a sale. We do not guarantee automated collection from every retailer.</p>
        <p>If a payment is duplicated or paid access cannot be delivered, contact support with the payment reference for refund review before paying again. If the estimator service is discontinued, we will communicate the closure and how affected purchasers can request review. Refunds are processed through the payment provider; an estimate you disagree with can also be submitted as price feedback. These descriptions do not limit applicable consumer rights.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">10. Shops</h2>
        <p>
          Shop pages are tools for independent shop sellers. Shop owners are responsible
          for their own inventory, pricing, availability, fulfillment, payment handling,
          customer service, warranties, and legal compliance. Go Pair PH may approve,
          reject, suspend, or remove shop access when needed to protect users or the platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">11. Brand names and official links</h2>
        <p>
          Go Pair PH is not affiliated with, sponsored by, or endorsed by Nike, Adidas,
          ASICS, New Balance, HOKA, On, Puma, Saucony, Brooks, Mizuno, Salomon, Under
          Armour, or any other shoe brand unless clearly stated. Brand names are used only
          to identify listed products and help buyers search. Official brand links on the
          site are provided for price checking and reference only.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">12. Content you post</h2>
        <p>
          You retain ownership of the photos and text you upload. By posting, you grant
          Go Pair PH a non-exclusive, royalty-free license to display, reproduce, and
          distribute that content as needed to operate, improve, promote, and share the
          site. This includes use on browse pages, listing pages, shop pages, profile pages,
          search results, social previews, share cards, captions, emails, and marketplace
          promotional materials related to the listing or platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">13. Emails and notifications</h2>
        <p>
          By using Go Pair PH, you agree that we may send transactional and service-related
          messages, including sign-in/account messages, offers, orders, free-pair requests,
          shop updates, saved-search alerts, listing-view milestones, safety notices, and
          support replies. Promotional and community-update emails require your separate
          opt-in and can be disabled at any time from your profile or an unsubscribe link.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">14. Disclaimer of warranties</h2>
        <p>
          The site is provided &quot;as is&quot; and &quot;as available&quot;. We make no
          warranties about uptime, the accuracy of listings, the conduct of users, or the
          quality of any item. Use the site at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">15. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Go Pair PH and its operators are not
          liable for any direct, indirect, incidental, or consequential damages arising
          from your use of the site or any transaction conducted through it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">16. Account termination</h2>
        <p>
          You may delete your account at any time by contacting us. We may suspend or
          terminate accounts, listings, shops, promotions, or feature access that violate
          these terms, are inactive for an extended period, appear misleading, or pose a
          risk to other users or Go Pair PH.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">17. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of the Philippines, without
          regard to conflict of law principles. Any disputes will be resolved in the
          appropriate courts of Pampanga.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">18. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after
          changes are posted constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">19. Contact</h2>
        <p>
          Questions about these terms?{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            Contact us
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
