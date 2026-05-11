import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms and conditions for using Go Pair PH, a running shoe marketplace and shop storefront platform in Pampanga.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service" lastUpdated="May 2026">
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Acceptance of terms</h2>
        <p>
          By accessing or using Go Pair PH (&quot;the site&quot;, &quot;we&quot;,
          &quot;us&quot;), you agree to these Terms of Service. If you do not agree, please
          do not use the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Eligibility</h2>
        <p>
          You must be at least 18 years old to create an account. You agree to provide
          accurate information about yourself and your listings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. What Go Pair PH is (and isn&apos;t)</h2>
        <p>
          Go Pair PH is a <strong>listing and shop storefront platform</strong>. We connect buyers
          with community sellers and independent shop sellers, but we do not handle payments,
          hold inventory, ship items, verify the authenticity of shoes, or guarantee the conduct
          of any user or shop. All transactions are conducted directly between buyers and sellers.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. User responsibilities</h2>
        <p>You agree to:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Describe items honestly, including condition, mileage, and any defects.</li>
          <li>Use only photos of the actual item you are listing.</li>
          <li>Honor purchase requests you accept and complete agreed-upon transactions in good faith.</li>
          <li>Treat other users with respect — no harassment, hate speech, or threats.</li>
          <li>Comply with all applicable laws when buying, selling, shipping, or meeting up.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Prohibited content & conduct</h2>
        <p>You may not list, post, or facilitate:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Counterfeit or stolen goods.</li>
          <li>Items unrelated to running shoes (the marketplace is purpose-built).</li>
          <li>Spam, fraud, scams, or fake listings.</li>
          <li>Impersonation of another person or business.</li>
          <li>Anything illegal under Philippine law.</li>
        </ul>
        <p>
          We reserve the right to remove listings or suspend accounts that violate these
          terms, at our sole discretion and without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Transactions between users</h2>
        <p>
          Once a seller accepts a purchase request, the buyer and seller arrange the
          transaction directly — by meetup, online payment, shipping, or any combination.
          Go Pair PH is not a party to these transactions and is not responsible for
          payment, delivery, condition disputes, or loss. We strongly encourage following
          our{' '}
          <Link href="/safety" className="text-teal-400 hover:text-teal-300">
            Safety Guide
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">7. Content you post</h2>
        <p>
          You retain ownership of the photos and text you upload. By posting, you grant
          Go Pair PH a non-exclusive, royalty-free license to display, reproduce, and
          distribute that content as needed to operate the site (e.g., on browse and
          listing pages, in search results).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">8. Disclaimer of warranties</h2>
        <p>
          The site is provided &quot;as is&quot; and &quot;as available&quot;. We make no
          warranties about uptime, the accuracy of listings, the conduct of users, or the
          quality of any item. Use the site at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">9. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Go Pair PH and its operators are not
          liable for any direct, indirect, incidental, or consequential damages arising
          from your use of the site or any transaction conducted through it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">10. Account termination</h2>
        <p>
          You may delete your account at any time by contacting us. We may suspend or
          terminate accounts that violate these terms, are inactive for an extended period,
          or pose a risk to other users.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">11. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of the Philippines, without
          regard to conflict of law principles. Any disputes will be resolved in the
          appropriate courts of Pampanga.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">12. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after
          changes are posted constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">13. Contact</h2>
        <p>
          Questions about these terms?{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            Contact us
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  );
}
