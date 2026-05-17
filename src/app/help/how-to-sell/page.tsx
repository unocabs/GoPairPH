import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How to Sell Running Shoes Faster',
  description: 'Use Go Pair PH as a clean seller link for Facebook groups, Marketplace, Messenger, and Pampanga running-shoe buyers.',
  alternates: { canonical: '/help/how-to-sell' },
};

export default function HowToSellPage() {
  return (
    <InfoPage
      title="How to Sell"
      subtitle="Create one clean Go Pair PH listing, then share it anywhere buyers already talk: Facebook groups, Marketplace, Messenger, or your shop page."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">Go Pair PH works with Facebook, not against it</h2>
        <p>
          Facebook is still where many local buyers discover pairs. Go Pair PH gives your post a
          better home: a clean, searchable listing page with photos, size, condition, mileage,
          price, seller profile, and contact path in one place.
        </p>
        <p>
          The simple flow is: list once on Go Pair PH, copy your listing link, then share that
          link to Facebook groups, Marketplace, Messenger chats, your shop page, or your personal
          profile. When buyers ask for details, you send the same link instead of repeating the
          same information over and over.
        </p>
      </section>

      <section className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.04] p-5">
        <h2 className="text-xl font-semibold text-gray-100">Why this helps sellers</h2>
        <ul className="mt-3 list-disc list-inside space-y-1.5">
          <li><strong>Cleaner than a comment thread</strong> — buyers can see the full pair details immediately.</li>
          <li><strong>Built for runners</strong> — size, mileage, condition, brand, and model are treated as first-class details.</li>
          <li><strong>Searchable longer</strong> — your pair can still be found after a Facebook post gets buried.</li>
          <li><strong>Easy to share</strong> — one link works for FB groups, Marketplace, Messenger, and shop pages.</li>
          <li><strong>More trust</strong> — real photos, seller profiles, and verification signals help buyers decide faster.</li>
        </ul>
        <p className="mt-4">
          Ready to try it?{' '}
          <Link href="/listings/new" className="text-teal-400 hover:text-teal-300">List your shoes</Link>
          {' '}and use Go Pair PH as the source of truth for the sale.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Choose how you sell</h2>
        <p>
          Community sellers can list individual running shoes from their own rotation. Shop
          sellers are independent running-shoe resellers with storefront pages on Go Pair PH.
          Sellers from nearby areas are welcome if they can meet, deliver, or ship to Pampanga
          buyers. If you want a shop page for your inventory, start at{' '}
          <Link href="/shop" className="text-teal-400 hover:text-teal-300">Shops</Link>{' '}
          and open the shop application.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Set up your profile</h2>
        <p>
          Add your <strong>Facebook username</strong> in{' '}
          <Link href="/profile" className="text-teal-400 hover:text-teal-300">My Profile → Edit Profile</Link>{' '}
          so buyers can reach you on Messenger. This is required so interested buyers can
          easily contact you.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. List a shoe</h2>
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
        <h2 className="text-xl font-semibold text-gray-100">4. Add good photos</h2>
        <p>
          Top and sole photos are required. Add a few more angles if there&apos;s notable wear
          or any defects. Real, well-lit photos sell faster than stock images.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Share your clean listing link</h2>
        <p>
          After publishing, open the listing page and use the seller share buttons to copy the
          link or create a share post. Then paste it wherever your buyers already are:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Facebook running groups and local buy/sell groups</li>
          <li>Facebook Marketplace descriptions or comments</li>
          <li>Messenger conversations with interested buyers</li>
          <li>Your shop page, personal profile, or weekly inventory post</li>
        </ul>
        <p>
          A good caption is short: brand, model, size, condition, price, location, and the Go Pair
          PH link for full photos and details.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Review incoming offers or orders</h2>
        <p>
          When buyers send offers, you&apos;ll see them in{' '}
          <Link href="/profile?tab=purchases" className="text-teal-400 hover:text-teal-300">My Profile → Purchase Requests</Link>.
          The avatar icon in the top-right shows a dot when you have new ones.
        </p>
        <p>
          For each request you can <strong>Accept</strong> or <strong>Decline</strong>. Accepting
          reserves the listing for that buyer and automatically declines the others.
        </p>
        <p>
          Shop sellers can also receive orders for shop listings, including size-specific
          requests when a listing has multiple available sizes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">7. Coordinate payment, shipping, or meetup</h2>
        <p>
          Use the <strong>Message on Messenger</strong> button on the request card to
          coordinate meetup, delivery, or shipping with the buyer. Check the{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">Safety Guide</Link>{' '}
          for tips on safe meetups and payment.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">8. Mark as sold</h2>
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
