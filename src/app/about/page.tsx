import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Go Pair PH is a community-built running shoe marketplace and shop storefront platform for runners and shoe resellers in Pampanga, Philippines.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Go Pair PH"
      subtitle="A community marketplace and storefront home for Pampanga runners and local shoe resellers."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What we do</h2>
        <p>
          Go Pair PH connects Pampanga runners with running shoes from both community sellers
          and local shop sellers. You can browse new pairs, pre-loved pairs, and donations, or
          list your own running shoes for buyers nearby.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Shops on Go Pair PH</h2>
        <p>
          Go Pair PH also gives local shoe resellers a simple online storefront, especially
          shops that sell through Facebook but do not have their own website yet. A shop can
          have its own public page, logo, banner, colors, carousel, about section, location,
          Facebook link, and listings, so it feels like their own place while still being part
          of the Go Pair PH marketplace.
        </p>
        <p>
          Shop owners can update their public shop details and design, while Go Pair PH keeps
          important controls like shop creation, ownership, URL slugs, and shop status under
          admin review. This helps shops present their brand professionally without making the
          marketplace confusing or unsafe for buyers.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Why we built it</h2>
        <p>
          Running shoes are expensive, and most runners cycle through several pairs a year.
          A pair that&apos;s past its peak for one runner can be perfect for another runner
          starting out, training shorter distances, or just looking for an affordable backup.
          Instead of letting good shoes sit in a closet (or worse, end up in a landfill), we
          make it easy to pass them on locally.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How it works</h2>
        <ul className="list-disc list-inside space-y-1.5 text-gray-300">
          <li>Sign in with your Google account.</li>
          <li>Go to your Profile and add your Facebook username.</li>
          <li>List a pair (with photos, size, mileage, and condition) for sale or donation.</li>
          <li>Browse shop storefronts and order directly from active shop listings.</li>
          <li>
            Browse listings from other runners in Pampanga, send a purchase request, and
            coordinate the deal directly with the seller.
          </li>
          <li>The seller marks the listing as sold once the exchange is complete.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Our community</h2>
        <p>
          Go Pair PH is intentionally local — listings are aimed at people who can meet up
          or ship within Pampanga. This keeps the community trustworthy and shipping costs
          low, and helps runners build relationships with people they&apos;ll actually run
          into at races.
        </p>
        <p>
          Our goal is to help individual runners and small local resellers share better,
          cleaner listing links, build trust, and keep more good pairs moving inside the
          running community.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Get in touch</h2>
        <p>
          Have feedback, a feature idea, or need help with your account?{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            Contact us
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
