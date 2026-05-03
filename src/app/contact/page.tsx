import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach the SoleSwapPH team for support, feedback, partnership inquiries, or to report a listing.',
  alternates: { canonical: '/contact' },
};

const SUPPORT_EMAIL = 'support@soleswapph.com';

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      subtitle="We read every message — usually reply within 1–2 business days."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">Email</h2>
        <p>
          For all inquiries (support, account help, reporting a listing, feature requests, or
          partnerships), reach us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal-400 hover:text-teal-300">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Reporting a problem</h2>
        <p>
          If a listing seems suspicious, a user is behaving inappropriately, or you suspect a
          scam, please email us with the listing URL or username and a short description of
          what happened. We take community safety seriously.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Account help</h2>
        <p>
          Trouble signing in, editing your profile, or deleting a listing? Please include
          your display name in your message so we can find your account quickly.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Before you write</h2>
        <p>
          Many common questions are answered in our{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">
            Safety Guide
          </Link>
          ,{' '}
          <Link href="/about" className="text-teal-400 hover:text-teal-300">
            About page
          </Link>
          , or our{' '}
          <Link href="/terms" className="text-teal-400 hover:text-teal-300">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
