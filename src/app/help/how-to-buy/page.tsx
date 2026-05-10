import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How to Buy',
  description: 'Step-by-step guide on how to buy from community sellers and shop sellers on Go Pair PH.',
  alternates: { canonical: '/help/how-to-buy' },
};

export default function HowToBuyPage() {
  return (
    <InfoPage
      title="How to Buy"
      subtitle="Buy from individual runners or independent shop sellers, then coordinate safely before payment or meetup."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Browse listings</h2>
        <p>
          Head to <Link href="/browse" className="text-teal-400 hover:text-teal-300">Browse</Link>{' '}
          to see all active listings. Use the filters on the side to narrow down by brand,
          condition, or size.
        </p>
        <p>
          Some listings are from normal community sellers, usually individual runners. Others
          are from shop sellers, which are independent resellers with storefront pages hosted
          on Go Pair PH.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Check the details</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Photos</strong> — top, sole, and any close-ups of wear.</li>
          <li><strong>Mileage</strong> — kilometers run on the shoes.</li>
          <li><strong>Condition</strong> — New, Like New, Good, or Fair.</li>
          <li><strong>Seller type</strong> — check whether you are buying from an individual seller or a shop.</li>
          <li><strong>Seller verification</strong> — verified individual sellers have a check badge next to their name.</li>
          <li><strong>Shop details</strong> — shop listings show the shop name, logo, location, and shop page when available.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. Send a request or place an order</h2>
        <p>
          For a normal seller, click <strong>Request to Buy</strong> on the listing page
          (or <strong>Send Offer</strong> on the listing card). If the seller marked the
          listing as <em>Negotiable</em>, you can propose a different price. Add a short
          message so the seller knows you&apos;re serious.
        </p>
        <p>
          For a shop seller, click <strong>Place Order</strong>. Choose the size if the listing
          has multiple sizes, then add your order details such as payment preference, delivery
          address, shipping or meetup preference, and any notes for the shop.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. Wait for confirmation</h2>
        <p>
          Track the status of your requests or orders under <Link href="/profile?tab=offers" className="text-teal-400 hover:text-teal-300">My Profile → Sent Offers</Link>.
          For normal sellers, you can retract an offer any time before the seller accepts it.
          For shop sellers, wait for the shop to confirm that the item, size, and delivery
          details are available.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Coordinate payment, shipping, or meetup</h2>
        <p>
          When a normal seller accepts, the listing is reserved for you. Use the{' '}
          <strong>Message on Messenger</strong> button or the seller&apos;s available contact
          details to coordinate a safe meetup or shipping.
        </p>
        <p>
          When a shop seller confirms your order, coordinate directly with the shop using
          their listed contact channel or Facebook page. Only send payment after the shop
          confirms your order details. Keep screenshots of your order, payment, and delivery
          conversation. See our{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">Safety Guide</Link>{' '}
          for tips.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Receive the pair</h2>
        <p>
          Once you&apos;ve received the shoes and you&apos;re happy with them, the seller or
          shop will mark the transaction as complete. For shop listings, this also helps
          update stock correctly. The shoes will then appear in your{' '}
          <Link href="/profile?tab=sales" className="text-teal-400 hover:text-teal-300">Purchase History</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Normal seller vs shop seller</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Normal sellers</strong> are individual Go Pair PH users, often runners selling or donating their own pairs.</li>
          <li><strong>Shop sellers</strong> are independent resellers with shop pages hosted on Go Pair PH.</li>
          <li><strong>Go Pair PH does not own or operate shop sellers.</strong> We provide the storefront and listing tools, but payment, delivery, and fulfillment are coordinated between you and the shop.</li>
          <li><strong>For both types,</strong> inspect details carefully, keep records, and never continue a deal that feels rushed or unsafe.</li>
        </ul>
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
