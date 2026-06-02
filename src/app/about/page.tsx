import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Go Pair PH is a focused running shoe marketplace for runners, community sellers, and shops across Central Luzon and NCR.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Go Pair PH"
      subtitle="A focused marketplace for runners, community sellers, and shops across Central Luzon and NCR."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What we do</h2>
        <p>
          Go Pair PH helps runners find and share running shoe listings in one focused place.
          Brand-new or pre-loved, for sale or donation, listings are organized around the
          details runners actually care about.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Selected seller pages</h2>
        <p>
          Some approved sellers may have dedicated Go Pair PH pages, but the marketplace is
          built first around helping runners find and share running shoe listings in one
          focused place.
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
          <li>
            Browse listings from runners and sellers across Central Luzon and NCR,
            then coordinate the deal directly with the seller.
          </li>
          <li>The seller marks the listing as sold once the exchange is complete.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Our community</h2>
        <p>
          Go Pair PH brings running shoe listings into one focused place for runners
          across Central Luzon and NCR, while keeping strong roots in the Pampanga
          running community.
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
