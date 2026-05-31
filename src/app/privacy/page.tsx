import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Go Pair PH collects, uses, shares, and protects information for buyers, sellers, shops, and runners using the marketplace.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" lastUpdated="May 2026">
      <section>
        <h2 className="text-xl font-semibold text-gray-100">1. Who we are</h2>
        <p>
          Go Pair PH (&quot;we&quot;, &quot;us&quot;) operates a running shoe marketplace and shop
          storefront platform focused on Pampanga, Philippines. This Privacy Policy explains
          what information we collect from buyers, community sellers, shop sellers, visitors,
          and other users (&quot;you&quot;), why we collect it, and how we use and protect it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">2. Information we collect</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Account information:</strong> your name, email address, and profile picture from Google sign-in.</li>
          <li><strong>Profile information:</strong> display name, location, optional Facebook Messenger username or profile link, verification status, and seller or shop details you provide.</li>
          <li><strong>Listings and shop content:</strong> shoe photos, brand, model, size, condition, mileage, price, description, location, availability, shop logos, shop pages, and related listing details.</li>
          <li><strong>GP Marketplace activity:</strong> offers, shop orders, donation requests, saved pairs, saved searches, Looking For posts, buyer demand signals, listing status updates, seller actions, and admin review activity.</li>
          <li><strong>Communications:</strong> messages or notes submitted through offer, order, donation, support, shop application, verification, and contact forms.</li>
          <li><strong>Listing analytics:</strong> listing views, daily view totals, unique view counts, timestamps, and limited technical identifiers used to count views and reduce duplicate or abusive activity.</li>
          <li><strong>Technical information:</strong> IP address, browser, device, pages visited, referring pages, cookies, session data, and server logs needed to operate, secure, measure, and improve the site.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">3. How we use it</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>To create and maintain your account and authenticate sign-ins.</li>
          <li>To display listings, seller profiles, shop pages, Looking For posts, saved pairs, saved searches, and public marketplace content.</li>
          <li>To connect buyers and sellers through offers, orders, donation requests, and contact options such as Messenger links when provided.</li>
          <li>To send transactional emails, marketplace notifications, saved-search match alerts, listing-view milestones, shop/order notices, and support replies.</li>
          <li>To measure marketplace activity, improve search and ranking, highlight active listings, and help sellers understand listing performance.</li>
          <li>To review, flag, promote, demote, remove, or moderate listings and accounts for quality, safety, trust, or policy reasons.</li>
          <li>To prevent abuse, spam, fraud, scams, and unsafe behavior on the platform.</li>
          <li>To respond when you contact us for support.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">4. Public information</h2>
        <p>
          Listings, shoe photos, prices, descriptions, seller names, profile photos,
          locations, shop pages, public seller profiles, and some activity signals may be
          visible to other users and visitors. Public pages may also appear in search
          engines, social media previews, shared links, screenshots, and cached pages.
          Your email address is <strong>not</strong> shown publicly. Your Messenger contact
          is shown only when you choose to provide it or use a feature that displays it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">5. Service providers and tools</h2>
        <p>
          We use third-party providers to run Go Pair PH. They process information only as
          needed to provide their services to us:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Supabase</strong> — database, authentication, and image storage.</li>
          <li><strong>Google</strong> — sign-in (OAuth).</li>
          <li><strong>Google Analytics</strong> — site measurement and usage analytics.</li>
          <li><strong>Vercel</strong> — site hosting, deployment, logs, and delivery.</li>
          <li><strong>Resend</strong> — transactional and notification emails.</li>
        </ul>
        <p>
          These providers may process data in the Philippines or other countries where
          they or their infrastructure providers operate. Each provider has its own privacy
          and security practices.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">6. Cookies</h2>
        <p>
          We use cookies and similar technologies to keep you signed in, maintain secure
          sessions, remember basic site behavior, count listing views, and understand site
          traffic. We also use Google Analytics for measurement. We do not sell your
          personal information, and we do not use cookies to run Go Pair PH-owned targeted
          advertising campaigns on the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">7. Legal basis and privacy principles</h2>
        <p>
          We collect and use personal information for legitimate marketplace purposes,
          to provide services you request, to secure the platform, to comply with legal
          obligations, and where needed with your consent. We aim to follow the Philippine
          Data Privacy Act principles of transparency, legitimate purpose, and proportionality.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">8. Your rights</h2>
        <p>
          Under the Philippine Data Privacy Act, you may have rights to be informed,
          access your personal information, correct inaccurate information, object to
          certain processing, request deletion or blocking, request data portability,
          withdraw consent where consent is the basis for processing, and file a complaint
          with the National Privacy Commission.
        </p>
        <p>
          You can edit your profile, listings, and some account information from your
          profile page. To request account deletion, data access, correction, or other
          privacy help, contact us through{' '}
          <Link href="/contact" className="text-teal-400 hover:text-teal-300">
            our contact page
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">9. Data retention</h2>
        <p>
          We keep account, listing, shop, offer, request, and activity data while your
          account is active or while it is needed to operate the marketplace, resolve
          disputes, prevent abuse, support users, comply with legal obligations, or keep
          reasonable business records. If you request deletion, we will remove or anonymize
          personal information from active systems within a reasonable period, unless we
          need to retain certain information for legal, safety, security, fraud-prevention,
          backup, or legitimate recordkeeping reasons.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">10. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect personal
          information, including trusted infrastructure providers, authenticated access,
          and platform rules. No website or online service can guarantee absolute security,
          so please use strong account security and avoid sharing sensitive information
          unnecessarily in public listing text.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">11. Children</h2>
        <p>
          Go Pair PH is not directed at users under 18. If you believe a minor has created
          an account, please contact us so we can remove it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">12. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at
          the top reflects the most recent change. Material changes will be highlighted on
          the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">13. Contact</h2>
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
