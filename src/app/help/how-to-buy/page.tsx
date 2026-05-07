import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How to Buy',
  description: 'Step-by-step guide on how to find and buy pre-loved running shoes on Go Pair PH.',
  alternates: { canonical: '/help/how-to-buy' },
};

export default function HowToBuyPage() {
  return (
    <InfoPage
      title="How to Buy"
      subtitle="Find a pair you like, send an offer, then meet up with the seller or wait for delivery."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Browse listings</h2>
        <p>
          Head to <Link href="/browse" className="text-teal-400 hover:text-teal-300">Browse</Link>{' '}
          to see all active listings. Use the filters on the side to narrow down by brand,
          condition, or size.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Check the details</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Photos</strong> — top, sole, and any close-ups of wear.</li>
          <li><strong>Mileage</strong> — kilometers run on the shoes.</li>
          <li><strong>Condition</strong> — New, Like New, Good, or Fair.</li>
          <li><strong>Seller verification</strong> — verified sellers have a check badge next to their name.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. Send an offer</h2>
        <p>
          Click <strong>Request to Buy</strong> on the listing page (or <strong>Send Offer</strong>{' '}
          on the listing card). If the seller marked the listing as <em>Negotiable</em>, you can
          propose a different price. Add a short message so the seller knows you&apos;re serious.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. Wait for the seller&apos;s response</h2>
        <p>
          Track the status of your offers under <Link href="/profile?tab=offers" className="text-teal-400 hover:text-teal-300">My Profile → Sent Offers</Link>.
          You can retract an offer any time before the seller accepts it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Coordinate the meetup</h2>
        <p>
          When the seller accepts, the listing is reserved for you. Use the{' '}
          <strong>Message on Messenger</strong> button on the listing page to coordinate
          a safe meetup or arrange shipping. See our{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">Safety Guide</Link>{' '}
          for tips.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Receive the pair</h2>
        <p>
          Once you&apos;ve received the shoes and you&apos;re happy with them, the seller
          will mark the transaction as sold. The shoes will then appear in your{' '}
          <Link href="/profile?tab=sales" className="text-teal-400 hover:text-teal-300">Purchase History</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Can&apos;t find what you want?</h2>
        <p>
          Post a wishlist item and let other runners know what you&apos;re looking for. See{' '}
          <Link href="/help/wishlist" className="text-teal-400 hover:text-teal-300">How Wishlist Works</Link>{' '}
          for details.
        </p>
      </section>
    </InfoPage>
  );
}
