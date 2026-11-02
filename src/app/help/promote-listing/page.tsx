import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Featured & Top Pick Listings',
  description:
    'How Featured and Top Pick listings work on Go Pair PH — pricing, slots, and what to expect.',
  alternates: { canonical: '/help/promote-listing' },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PromoteListingPage() {
  return (
    <InfoPage
      title="Featured & Top Pick Listings"
      subtitle="Get more eyes on your shoes — here's how it works."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">The two ways your listing can stand out</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>★ Featured</strong> — our weekly &ldquo;Pair of the Week&rdquo; on the home page. A seller
            may pay for this placement at the current Featured rate, or an admin may choose any
            active listing we think the community will love. <strong>₱50 / 7 days</strong> or{' '}
            <strong>₱150 / 30 days</strong>.
          </li>
          <li>
            <strong>Top Pick</strong> — sellers can boost a listing near the top of Browse and join
            the homepage Top Picks rotation for 7 or 30 days. <strong>₱30 / 7 days</strong> or <strong>₱100 / 30 days</strong>.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Flash Deals: promote a real price drop</h2>
        <p>Offer at least 10% below your lowest asking price from the last 7 days. For 20 GP Coins (₱10 value), your shoes join the Flash Deals homepage rotation for 24 hours. You fund the discount. Regular price edits are always free.</p>
        <p><Link href="/flash-deals/new" className="font-semibold text-teal-300 underline">Start a flash deal</Link> · <Link href="/help/flash-deals" className="text-teal-300 underline">How Flash Deals and coin purchases work</Link></p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Who can request a promotion?</h2>
        <p>
          Featured and Top Pick are open to <Link href="/help/verification" className="text-teal-400 hover:text-teal-300">verified users</Link>,
          including community sellers and shop sellers. This protects buyers from boosted scam listings.
          If you&apos;re not verified yet, get verified first — it&apos;s a quick process and unlocks
          promotion options along with other perks.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How Featured works</h2>
        <p>
          Featured is the home-page highlight for one listing at a time. It is designed for sellers
          who want their running shoes to be the first thing visitors see when they land on Go Pair PH.
        </p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open your listing, click <strong>Promote Listing</strong>, then choose <strong>Featured on Home</strong>.</li>
          <li>Pick a duration: <strong>7 days (₱50)</strong> or <strong>30 days (₱150)</strong>.</li>
          <li>Choose QR Ph, GP Coins, or a mix of both. Pay any remaining amount through PayMongo QR Ph checkout.</li>
          <li>After verified payment, your shoes become Featured if the spotlight is available, or join the paid Featured queue. Your promotion window starts when your placement activates.</li>
          <li>Your listing appears on the home page with a clear <strong>★ Featured</strong> tag until the window ends or the item sells.</li>
        </ol>
        <p className="mt-3 text-sm text-gray-400">
          Featured is separate from Top Pick. Featured highlights your listing on the home page,
          while Top Pick lifts it near the top of Browse and includes rotating homepage exposure.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Using GP Coins for Featured</h2>
        <p>
          GP Coins can be used for <strong>Featured on Home</strong>. They help lower the amount
          needed to promote your running shoes on the Go Pair PH home page.
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>QR Ph:</strong> pay the full Featured price by scanning the QR code in PayMongo checkout with your banking or e-wallet app.</li>
          <li><strong>GP Coins + QR Ph:</strong> use coins for part of the Featured price, then pay the remaining amount through PayMongo QR Ph.</li>
          <li><strong>GP Coins only:</strong> if your balance covers the full Featured price, confirm your coins without opening PayMongo. Full coin payment is limited to once every 30 days.</li>
          <li>QR Ph payments are verified automatically. Check your reference and placement status in Promotion payments from your profile.</li>
          <li>GP Coins do not apply to Top Pick. Pay for Top Pick through PayMongo QR Ph checkout.</li>
          <li>Other enabled PayMongo payment methods may also appear at checkout. GP Coins are Go Pair PH promotional credits. They cannot be withdrawn, transferred, or exchanged for cash.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How Top Pick works</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open your listing and click <strong>Promote Listing</strong>.</li>
          <li>Pick a duration: <strong>7 days (₱30)</strong> or <strong>30 days (₱100)</strong>.</li>
          <li>Review the total and choose Pay with QR Ph. An available slot is held while you complete checkout.</li>
          <li>Scan the QR Ph code shown in PayMongo checkout using your banking or e-wallet app, then confirm the payment in your app.</li>
          <li>Your listing becomes a Top Pick after payment has been verified automatically.</li>
        </ol>
        <p className="mt-3 text-sm text-gray-400">
          The homepage shows up to four Top Picks at a time. Active, in-stock marketplace listings
          with photos and no quality flags are eligible. When more than four are eligible, the
          selection rotates hourly, so homepage display is not continuous. Shoes already in the
          Featured spotlight are not repeated in Top Picks.
        </p>
        <p className="mt-3 text-sm text-gray-400">
          Top Pick is paid placement. Returning from checkout does not prove payment succeeded. Check your payment status before trying to pay again.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Slot rules — why we cap it</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            We cap Top Pick at roughly <strong>15% of active listings</strong>. This keeps Browse honest
            and stops Top Pick cards from drowning out organic ones.
          </li>
          <li>
            If all slots are taken, you&apos;ll see the next expected opening when available. Checkout holds count toward the cap. <strong>There is no waiting queue for Top Pick.</strong>
          </li>
          <li>
            If a Top Pick listing sells (or gets reserved) before its window ends, that slot frees up
            immediately for the next seller.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Payment status, cancellations, and refunds</h2>
        <p>
          Find your reference, resume an existing checkout, or refresh confirmation in{' '}
          <Link href="/promotions/payments" className="text-teal-400 hover:text-teal-300">Promotion payments</Link>.
          If you already paid, avoid paying again while confirmation is pending.
          Cancelling an unpaid checkout releases its slot and GP Coins only after PayMongo confirms it is closed.
          A processing payment may take longer to resolve.
        </p>
        <p>
          If payment was received but your promotion cannot start, contact support with your reference for review.
          QR Ph payment refunds are processed through PayMongo and marked refunded after provider confirmation.
          Eligible GP Coins are returned to your wallet. A refund request or review note does not mean a payment refund has completed.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">If your listing sells before the promotion ends — that&apos;s the win!</h2>
        <p>
          Here&apos;s the thing: the whole point of paying for a Top Pick slot is to <strong>sell faster</strong>.
          If your shoes sell on day 2 of a 7-day promotion, that means the boost worked exactly as
          intended. 🎉
        </p>
        <p>
          So please note — <strong>we don&apos;t refund or carry over the unused days</strong>. You&apos;re paying
          for a window of attention, not a fixed amount of time on the page. Selling early IS the
          goal. Think of it the same way you&apos;d think about a Facebook Ad budget — you spent it,
          and the result was a fast sale. That&apos;s a great outcome.
        </p>
        <p className="text-sm text-gray-400">
          Same goes for Featured — if your listing is chosen or paid into &ldquo;Pair of the Week&rdquo; and it
          sells in three days, congrats! No carryover. Admin-picked Featured slots are a thank-you
          from us to the community; paid Featured slots follow the same promotion-window policy.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Honesty &amp; transparency</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Top Pick listings always show a clear <strong>&ldquo;Top Pick&rdquo;</strong> tag.</li>
          <li>
            Top Pick is paid placement. Buyers should still review each listing carefully.
          </li>
          <li>
            Featured means the listing is highlighted on the home page. It may be an admin choice
            or a paid placement, and buyers should still do their usual checks.
          </li>
          <li>
            We may decline or revoke a promotion for listings that violate community guidelines
            (counterfeit shoes, misleading photos, etc.). If we do, we&apos;ll refund — those rare cases
            aren&apos;t the seller&apos;s fault.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Questions?</h2>
        <p>
          Message us anytime via{' '}
          <a
            href="https://m.me/GoPairPH"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:text-teal-300"
          >
            Messenger
          </a>{' '}
          or email the Go Pair PH inbox at{' '}
          <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}`} className="text-teal-400 hover:text-teal-300">
            {PUBLIC_SUPPORT_EMAIL}
          </a>
          . We&apos;d rather over-explain than have you feel lost — promotions involve real money, so
          ask anything.
        </p>
      </section>
    </InfoPage>
  );
}
