import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';

export const metadata: Metadata = {
  title: 'How Wishlist Works',
  description: 'Learn how to post wishlist items and let other runners help you find your next pair.',
  alternates: { canonical: '/help/wishlist' },
};

export default function HowWishlistWorksPage() {
  return (
    <InfoPage
      title="How Wishlist Works"
      subtitle="Tell the community what you're looking for, and let sellers come to you."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What is a wishlist item?</h2>
        <p>
          A wishlist item is a public post that says <em>&quot;I&apos;m looking for this pair.&quot;</em>{' '}
          Other runners who own that pair (or know someone who does) can suggest a match.
          It&apos;s the reverse of a listing — instead of you searching, sellers find you.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Posting a wishlist item</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Go to <Link href="/wishlist/new" className="text-teal-400 hover:text-teal-300">Post a Wishlist Item</Link>.</li>
          <li>Add the brand, model, size, and your budget range.</li>
          <li>Optionally add reference photos and a short note about what you&apos;re after.</li>
          <li>Submit. Your wishlist item appears on the public{' '}
            <Link href="/wishlist" className="text-teal-400 hover:text-teal-300">Wishlist</Link>{' '}
            page.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Receiving suggestions</h2>
        <p>
          When someone suggests a match, you&apos;ll see it on your wishlist item. Review the
          shoe details, message the seller on Messenger, and if it&apos;s a fit, send them a
          purchase offer.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Managing your wishlist</h2>
        <p>
          Track all your wishlist items under{' '}
          <Link href="/profile?tab=wishlist" className="text-teal-400 hover:text-teal-300">My Profile → Wishlist</Link>.
          Edit or remove items any time.
        </p>
      </section>
    </InfoPage>
  );
}
