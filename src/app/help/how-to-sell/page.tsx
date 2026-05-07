import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How to Sell',
  description: 'Step-by-step guide on listing and selling your pre-loved running shoes on Go Pair PH.',
  alternates: { canonical: '/help/how-to-sell' },
};

export default function HowToSellPage() {
  return (
    <InfoPage
      title="How to Sell"
      subtitle="List your pair, accept the right offer, and complete the sale."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Set up your profile</h2>
        <p>
          Add your <strong>Facebook username</strong> in{' '}
          <Link href="/profile" className="text-teal-400 hover:text-teal-300">My Profile → Edit Profile</Link>{' '}
          so buyers can reach you on Messenger. This is required so interested buyers can
          easily contact you.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. List a shoe</h2>
        <p>
          Go to <Link href="/listings/new" className="text-teal-400 hover:text-teal-300">+ List a Shoe</Link>{' '}
          and fill in the details:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Brand &amp; model</strong> — pick from the list, or choose &quot;Other&quot; and add the model name.</li>
          <li><strong>Color &amp; size</strong> — fill any one size (EU, US, or CM), the others auto-fill.</li>
          <li><strong>Condition &amp; mileage</strong> — be honest. New shoes auto-set mileage to 0.</li>
          <li><strong>Listing type</strong> — For Sale or Donate (free).</li>
          <li><strong>Price</strong> — toggle <em>Negotiable</em> if you&apos;re open to offers.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. Add good photos</h2>
        <p>
          Top and sole photos are required. Add a few more angles if there&apos;s notable wear
          or any defects. Real, well-lit photos sell faster than stock images.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. Review incoming offers</h2>
        <p>
          When buyers send offers, you&apos;ll see them in{' '}
          <Link href="/profile?tab=purchases" className="text-teal-400 hover:text-teal-300">My Profile → Purchase Requests</Link>.
          The avatar icon in the top-right shows a dot when you have new ones.
        </p>
        <p>
          For each request you can <strong>Accept</strong> or <strong>Decline</strong>. Accepting
          reserves the listing for that buyer and automatically declines the others.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Coordinate the meetup</h2>
        <p>
          Use the <strong>Message on Messenger</strong> button on the request card to
          coordinate a meetup or shipping. Check the{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">Safety Guide</Link>{' '}
          for tips on safe meetups and payment.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Mark as sold</h2>
        <p>
          After the buyer has received the pair and paid, click{' '}
          <strong>Mark as Sold</strong> on the request card. The listing becomes &quot;Sold&quot;
          and the transaction is added to both your and the buyer&apos;s purchase histories.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Tip: Get verified</h2>
        <p>
          Verified sellers get a check badge that helps buyers trust them faster. See the{' '}
          <Link href="/help/verification" className="text-teal-400 hover:text-teal-300">Verification Process</Link>{' '}
          for how to request it.
        </p>
      </section>
    </InfoPage>
  );
}
