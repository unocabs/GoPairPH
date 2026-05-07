import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Featured & Sponsored Listings',
  description:
    'How Featured and Sponsored listings work on Go Pair PH — pricing, slots, and what to expect.',
  alternates: { canonical: '/help/promote-listing' },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PromoteListingPage() {
  return (
    <InfoPage
      title="Featured & Sponsored Listings"
      subtitle="Get more eyes on your shoes — here's how it works."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">The two ways your listing can stand out</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>★ Featured</strong> — our weekly &ldquo;Pick of the Week&rdquo; on the home page. We
            choose these manually, and it&apos;s free. You can&apos;t buy your way in — we look for
            listings the community will love.
          </li>
          <li>
            <strong>Sponsored</strong> — seller-paid promotion. Pin your listing to the top of
            Browse for 7 or 30 days. ₱50 or ₱150.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Who can buy a Sponsored slot?</h2>
        <p>
          Only <Link href="/help/verification" className="text-teal-400 hover:text-teal-300">verified users</Link>.
          This protects buyers from boosted scam listings. If you&apos;re not verified yet, get
          verified first — it&apos;s a quick process and unlocks Sponsored along with other perks.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How Sponsored works</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Open your listing and click <strong>Promote Listing</strong>.</li>
          <li>Pick a duration: <strong>7 days (₱50)</strong> or <strong>30 days (₱150)</strong>.</li>
          <li>Pay via GCash or BPI — QR codes are shown in the modal.</li>
          <li>Send the receipt screenshot via Messenger.</li>
          <li>An admin activates your slot within 24 hours, and your listing rises to the top of Browse with a &ldquo;Sponsored&rdquo; tag.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Slot rules — why we cap it</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            We cap Sponsored at roughly <strong>15% of active listings</strong>. This keeps Browse honest
            and stops Sponsored cards from drowning out organic ones.
          </li>
          <li>
            If all slots are taken, you&apos;ll see when the next slot opens up. <strong>No reservation queue
            — first paid wins.</strong> When that date arrives, refresh and try again.
          </li>
          <li>
            If a Sponsored listing sells (or gets reserved) before its window ends, that slot frees up
            immediately for the next seller.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">If your listing sells before the promotion ends — that&apos;s the win!</h2>
        <p>
          Here&apos;s the thing: the whole point of paying for a Sponsored slot is to <strong>sell faster</strong>.
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
          Same goes for Featured — if we pick your listing for &ldquo;Pick of the Week&rdquo; and it sells in
          three days, congrats! No carryover, but also no payment required. It&apos;s a thank-you from us
          to the community.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Honesty &amp; transparency</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Sponsored listings always show a clear <strong>&ldquo;Sponsored&rdquo;</strong> tag.</li>
          <li>
            Go Pair PH does <em>not</em> endorse Sponsored sellers — promotion is paid placement,
            not a quality stamp. Buyers should still review each listing carefully.
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
            href="https://m.me/geeyan.cabrera"
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
