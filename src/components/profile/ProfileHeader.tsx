'use client';

import Image from 'next/image';
import { type Profile } from '@/types';
import { formatRelativeDate } from '@/lib/utils';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileHeaderProps {
  profile: Profile;
  listingCount: number;
  wishlistCount: number;
  isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, listingCount, wishlistCount, isOwnProfile }: ProfileHeaderProps) {
  return (
    // Center on mobile, left-align from sm+
    <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name}
          width={80}
          height={80}
          className="rounded-full border-4 border-gray-800 shrink-0"
        />
      ) : (
        <div className="h-20 w-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
          {profile.display_name[0]?.toUpperCase() ?? 'U'}
        </div>
      )}

      <div className="w-full sm:w-auto">
        <h1 className="text-2xl font-bold text-gray-100 inline-flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge size="lg" />}
        </h1>
        {profile.location && (
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1 justify-center sm:justify-start">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {profile.location}
          </p>
        )}
        {profile.fb_username ? (
          <a
            href={`https://www.facebook.com/${profile.fb_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            {profile.fb_username}
          </a>
        ) : isOwnProfile ? (
          <p className="mt-1 text-xs text-gray-500">
            Add your Facebook username in{' '}
            <span className="text-gray-400">Edit Profile</span> so interested buyers can easily reach out to you.
          </p>
        ) : null}
        <p className="text-xs text-gray-500 mt-1">Member since {formatRelativeDate(profile.created_at)}</p>
        <div className="flex gap-4 mt-3 justify-center sm:justify-start text-sm">
          <span><strong className="text-gray-100">{listingCount}</strong> <span className="text-gray-500">listings</span></span>
          <span><strong className="text-gray-100">{wishlistCount}</strong> <span className="text-gray-500">pair requests</span></span>
        </div>
      </div>
    </div>
  );
}
