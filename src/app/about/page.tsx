import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'SoleSwapPH is a community-built running shoe marketplace for runners in Pampanga, Philippines. Learn what we do and why we built it.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About SoleSwapPH"
      subtitle="A community marketplace for Pampanga runners."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What we do</h2>
        <p>
          SoleSwapPH connects runners in Pampanga who want to buy, sell, or donate pre-loved
          running shoes. Every pair has miles left to give — and someone in your area is
          looking for exactly the model in your closet.
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
          <li>List a pair (with photos, size, mileage, and condition) for sale or donation.</li>
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
          SoleSwapPH is intentionally local — listings are aimed at people who can meet up
          or ship within Pampanga. This keeps the community trustworthy and shipping costs
          low, and helps runners build relationships with people they&apos;ll actually run
          into at races.
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
