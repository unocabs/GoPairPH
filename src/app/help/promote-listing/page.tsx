import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

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
            <strong>Top Pick</strong> — sellers can boost a listing near the top of Browse for 7 or
            30 days. <strong>₱30 / 7 days</strong> or <strong>₱100 / 30 days</strong>.
          </li>
        </ul>
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
          who want their pair to be the first thing visitors see when they land on Go Pair PH.
        </p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open your listing, click <strong>Promote Listing</strong>, then choose <strong>Featured on Home</strong>.</li>
          <li>Pick a duration: <strong>7 days (₱50)</strong> or <strong>30 days (₱150)</strong>.</li>
          <li>Pay via GCash or BPI, then send the receipt screenshot to Go Pair PH on Messenger with your listing link and selected placement.</li>
          <li>An admin confirms availability, then activates your Featured slot within 24 hours after payment confirmation.</li>
          <li>Your listing appears on the home page with a clear <strong>★ Featured</strong> tag until the window ends or the item sells.</li>
        </ol>
        <p className="mt-3 text-sm text-gray-400">
          Featured is separate from Top Pick. Featured highlights your listing on the home page,
          while Top Pick lifts it near the top of Browse.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How Top Pick works</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open your listing and click <strong>Promote Listing</strong>.</li>
          <li>Pick a duration: <strong>7 days (₱30)</strong> or <strong>30 days (₱100)</strong>.</li>
          <li>Pay via GCash or BPI — QR codes are shown in the modal.</li>
          <li>Send the receipt screenshot to Go Pair PH on Messenger with your listing link and selected placement.</li>
          <li>An admin activates your slot within 24 hours, and your listing rises near the top of Browse with a &ldquo;Top Pick&rdquo; tag.</li>
        </ol>
        <p className="mt-3 text-sm text-gray-400">
          Top Pick is paid placement. We only activate Top Pick after a seller payment is confirmed.
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
            If all slots are taken, you&apos;ll see when the next slot opens up. <strong>No reservation queue
            — first paid wins.</strong> When that date arrives, refresh and try again.
          </li>
          <li>
            If a Top Pick listing sells (or gets reserved) before its window ends, that slot frees up
            immediately for the next seller.
          </li>
        </ul>
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
          or email{' '}
          <a href="mailto:rgiancabrera@gmail.com" className="text-teal-400 hover:text-teal-300">
            rgiancabrera@gmail.com
          </a>
          . We&apos;d rather over-explain than have you feel lost — promotions involve real money, so
          ask anything.
        </p>
      </section>
    </InfoPage>
  );
}
