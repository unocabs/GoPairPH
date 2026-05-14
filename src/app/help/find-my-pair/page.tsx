import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How Find My Pair Works',
  description: 'Learn how to post a pair request and let the community drop available links to running shoes.',
  alternates: { canonical: '/help/find-my-pair' },
};

export default function HowFindMyPairWorksPage() {
  return (
    <InfoPage
      title="How Find My Pair Works"
      subtitle="Post the pair you're looking for and let the community drop available links."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What is Find My Pair?</h2>
        <p>
          Find My Pair is a public board for running shoe requests. Runners can post the
          brand, model, size, budget, and location they are looking for, then anyone can
          drop available links from Go Pair PH, Facebook Marketplace, Carousell, shop
          pages, or other sources.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Posting a pair request</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Go to <Link href="/find-my-pair/new" className="text-teal-400 hover:text-teal-300">Post a Pair Request</Link>.</li>
          <li>Add the brand, model, size, and your budget range.</li>
          <li>Optionally add reference photos and a short note about what you&apos;re after.</li>
          <li>Submit. Your request appears on the public{' '}
            <Link href="/find-my-pair" className="text-teal-400 hover:text-teal-300">Find My Pair</Link>{' '}
            page.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Dropping a lead</h2>
        <p>
          If you find a matching pair, paste the link and add an optional price or note.
          The link can point to a Go Pair PH listing, Facebook Marketplace post, shop page,
          or anywhere the pair is available.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Managing your requests</h2>
        <p>
          Track all your pair requests under{' '}
          <Link href="/profile?tab=wishlist" className="text-teal-400 hover:text-teal-300">My Profile → Find My Pair</Link>.
          Remove requests any time when you already found the pair.
        </p>
      </section>
    </InfoPage>
  );
}
