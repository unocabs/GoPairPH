import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/layout/InfoPage';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Verification Process',
  description: 'How to get a verified badge on Go Pair PH and why it matters.',
  alternates: { canonical: '/help/verification' },
};

export default function VerificationProcessPage() {
  return (
    <InfoPage
      title="Verification Process"
      subtitle="Earn a verified badge so buyers and sellers trust you faster."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-100">What it is</h2>
        <p>
          A verified badge looks like this <VerifiedBadge size="md" /> and appears next to
          your display name. It signals to other users that an admin has confirmed your
          account belongs to a real person — not a dummy account, not a bot, not a flipper
          hiding behind a fake profile.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Why get verified</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Faster trust.</strong> Buyers are more likely to send offers to verified sellers.</li>
          <li><strong>Better visibility.</strong> Verified profiles stand out in browse and listing pages.</li>
          <li><strong>Stronger negotiating position.</strong> Sellers tend to take verified buyers more seriously.</li>
          <li><strong>Community signal.</strong> You&apos;re showing the community you&apos;re here to deal honestly.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">How to request verification</h2>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            Make sure your <strong>Facebook username</strong> is set in{' '}
            <Link href="/profile" className="text-teal-400 hover:text-teal-300">My Profile → Edit Profile</Link>.
            Without it, the verification request can&apos;t be submitted.
          </li>
          <li>
            On <Link href="/profile" className="text-teal-400 hover:text-teal-300">My Profile</Link>,
            click <strong>Request verification</strong> (just under your profile header).
          </li>
          <li>
            Fill in proof that your account belongs to a real person. The stronger the
            proof, the faster the review.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">What makes a strong case</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            A <strong>public, accessible Facebook profile</strong> with a real photo, real
            name, and a visible posting history. Make sure your fb page is reachable —
            an admin will visit it.
          </li>
          <li>
            Identifiers that confirm you&apos;re legit — a link to your Instagram, LinkedIn,
            Strava, or any other public social profile that&apos;s tied to your real identity.
          </li>
          <li>
            A vouch from a friend who&apos;s already a verified user.
          </li>
        </ul>
        <p className="text-xs text-gray-500">
          <strong className="text-amber-300">Don&apos;t</strong> upload government IDs or
          sensitive personal documents — public profile links are enough.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">Need help?</h2>
        <p>
          If your fb page isn&apos;t accessible (private, restricted, etc.) or you need to
          send extra context, email the Go Pair PH inbox at{' '}
          <a href={`mailto:${PUBLIC_SUPPORT_EMAIL}`} className="text-teal-400 hover:text-teal-300">
            {PUBLIC_SUPPORT_EMAIL}
          </a>{' '}
          with your Go Pair PH display name and the proof.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-100">After you submit</h2>
        <p>
          You&apos;ll see a <em>Verification request pending review</em> badge on your profile
          while admins look it over. If approved, the verified badge appears next to your
          name everywhere on the site. If declined, you&apos;ll see the reason and can request
          again with stronger proof.
        </p>
      </section>
    </InfoPage>
  );
}
