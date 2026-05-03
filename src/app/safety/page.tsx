import type { Metadata } from 'next';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'Safety Guide',
  description:
    'Practical safety tips for buying, selling, and meeting up with other runners on SoleSwapPH.',
  alternates: { canonical: '/safety' },
};

export default function SafetyPage() {
  return (
    <InfoPage
      title="Safety Guide"
      subtitle="Quick rules of thumb to keep your transactions smooth and safe."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">Meeting in person</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Meet in a public place.</strong> Mall food courts, coffee shops, and gas stations are great choices. Avoid meeting at someone&apos;s home.</li>
          <li><strong>Bring someone with you</strong> for higher-value items, or at least let a friend know where you&apos;re going and when to expect you back.</li>
          <li><strong>Meet during daylight</strong> hours when possible.</li>
          <li><strong>Inspect the item carefully</strong> before paying. Check the size, condition, and any defects mentioned in the listing.</li>
          <li><strong>Pay in person</strong>: cash or a verified GCash / Maya transfer that you watch land before handing over the money.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Online payment + shipping</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Use traceable payment methods</strong> (GCash, Maya, bank transfer with a clear reference). Avoid gift cards or anything that can&apos;t be reversed.</li>
          <li><strong>Use a courier with proof of delivery</strong> (J&amp;T, LBC, Lalamove) — keep the tracking number and the delivery photo.</li>
          <li><strong>Sellers:</strong> ship promptly after payment is confirmed. Send the tracking number to the buyer.</li>
          <li><strong>Buyers:</strong> open the package on camera if the item is high-value, in case you need to dispute condition later.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Red flags to watch for</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>The other party refuses to share photos of the actual item or pressures you to commit fast.</li>
          <li>Prices that are far below market value with no good reason.</li>
          <li>Requests to move the conversation off-platform <em>before</em> the basics are agreed.</li>
          <li>Stories that pivot quickly: &quot;I&apos;m abroad, please send a deposit and I&apos;ll ship.&quot;</li>
          <li>Requests for unusual payment methods (crypto, gift cards, third-party escrow you&apos;ve never heard of).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Listing honestly (sellers)</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Use real photos of the actual pair — top and sole at minimum.</li>
          <li>Be upfront about mileage, defects, smells, or repairs.</li>
          <li>Price fairly. If you&apos;re not sure, browse comparable listings.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Reporting issues</h2>
        <p>
          If something feels off — a suspicious listing, harassment, or a deal gone wrong —
          please report it via our <a href="/contact" className="text-teal-400 hover:text-teal-300">contact page</a>.
          Include the listing URL or username and a short description.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Remember</h2>
        <p>
          SoleSwapPH is a listing platform — we don&apos;t handle payments or shipping. The
          best way to stay safe is to use common sense, keep records of every transaction,
          and never feel pressured to complete a deal you&apos;re not comfortable with.
        </p>
      </section>
    </InfoPage>
  );
}
