import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How Looking For Works',
  description: 'Learn how to post the running shoe you\'re looking for and let the community drop available links.',
  alternates: { canonical: '/help/looking-for' },
};

export default function HowLookingForWorksPage() {
  return (
    <InfoPage
      title="How Looking For Works"
      subtitle="Post the pair you're looking for and let the community drop available links."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What is Looking For?</h2>
        <p>
          Looking For is a public board for running shoe requests. Runners can post the
          brand, model, size, budget, and location they are looking for, then anyone can
          drop available links from Go Pair PH, Facebook Marketplace, Carousell, shop
          pages, or other sources.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Posting what you&apos;re looking for</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Go to <Link href="/looking-for/new" className="text-teal-400 hover:text-teal-300">Post what you&apos;re looking for</Link>.</li>
          <li>Add the brand, model, size, and your budget range.</li>
          <li>Optionally add reference photos and a short note about what you&apos;re after.</li>
          <li>Submit. Your post appears on the public{' '}
            <Link href="/looking-for" className="text-teal-400 hover:text-teal-300">Looking For Shoes</Link>{' '}
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
        <h2 className="text-xl font-semibold text-gray-100">Managing your posts</h2>
        <p>
          Track everything you&apos;re looking for under{' '}
          <Link href="/profile?tab=wishlist" className="text-teal-400 hover:text-teal-300">My Profile → Looking For</Link>.
          Remove a post any time when you already found the pair.
        </p>
      </section>
    </InfoPage>
  );
}
