import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Go Pair PH collects, uses, and protects your personal information when you use our running shoe marketplace and shop storefront platform.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" lastUpdated="May 2026">
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Who we are</h2>
        <p>
          Go Pair PH (&quot;we&quot;, &quot;us&quot;) operates a running shoe marketplace and shop
          storefront platform in Pampanga, Philippines. This Privacy Policy explains what
          information we collect from users, community sellers, shop sellers, and buyers
          (&quot;you&quot;) and how we use it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Information we collect</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Account info from Google sign-in:</strong> your name, email address, and profile picture, as provided by Google when you authenticate.</li>
          <li><strong>Profile info you give us:</strong> display name, location (e.g. &quot;Angeles City&quot;), optional Facebook Messenger username.</li>
          <li><strong>Listings:</strong> photos and details of shoes you list (brand, model, size, condition, price, description).</li>
          <li><strong>Activity:</strong> purchase requests you send or receive, Find My Pair requests, and messages between you and other users.</li>
          <li><strong>Technical:</strong> standard server logs (IP address, browser, timestamps) needed to operate the site.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. How we use it</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>To create and maintain your account and authenticate sign-ins.</li>
          <li>To display your listings, profile, and pair requests to other users.</li>
          <li>To deliver purchase requests and connect buyers with sellers.</li>
          <li>To prevent abuse, fraud, and unsafe behavior on the platform.</li>
          <li>To respond when you contact us for support.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. What other users see</h2>
        <p>
          Your display name, location, profile picture, and listings are visible to all
          other users (and to the public via search engines). Your email address is{' '}
          <strong>not</strong> shown publicly. Your Messenger username is only displayed if
          you choose to provide it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Service providers</h2>
        <p>We use the following third-party services to operate the platform:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Supabase</strong> — database, authentication, and image storage.</li>
          <li><strong>Google</strong> — sign-in (OAuth).</li>
          <li><strong>Vercel</strong> (or our hosting provider) — site hosting and delivery.</li>
        </ul>
        <p>Each provider has its own privacy practices governing the data it processes.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Cookies</h2>
        <p>
          We use only the cookies necessary to keep you signed in (session cookies from
          our authentication provider). We do not use third-party advertising or tracking
          cookies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">7. Your rights</h2>
        <p>
          Under the Philippine Data Privacy Act, you have the right to access, correct, and
          delete your personal information. You can edit your profile or delete your
          listings at any time from your profile page. To delete your account entirely,
          contact us at{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            our contact page
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">8. Data retention</h2>
        <p>
          We keep your data for as long as your account is active. When you request
          deletion, we remove your profile, listings, and personal information from active
          systems within a reasonable period (anonymized records may remain in backups for
          a limited time).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">9. Children</h2>
        <p>
          Go Pair PH is not directed at users under 18. If you believe a minor has created
          an account, please contact us so we can remove it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">10. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at
          the top reflects the most recent change. Material changes will be highlighted on
          the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">11. Contact</h2>
        <p>
          Questions about this policy or how we handle your data? Reach out via our{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            contact page
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
