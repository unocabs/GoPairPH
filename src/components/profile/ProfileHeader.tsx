'use client';

import Image from 'next/image';
import { type Profile } from '@/types';
import { formatRelativeDate } from '@/lib/utils';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileHeaderProps {
  profile: Profile;
  listingCount: number;
  wishlistCount: number;
}

export function ProfileHeader({ profile, listingCount, wishlistCount }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.display_name}
          width={80}
          height={80}
          className="rounded-full border-4 border-gray-800"
        />
      ) : (
        <div className="h-20 w-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
          {profile.display_name[0]?.toUpperCase() ?? 'U'}
        </div>
      )}

      <div className="text-center sm:text-left">
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
        <p className="text-xs text-gray-500 mt-1">Member since {formatRelativeDate(profile.created_at)}</p>
        <div className="flex gap-4 mt-3 justify-center sm:justify-start text-sm">
          <span><strong className="text-gray-100">{listingCount}</strong> <span className="text-gray-500">listings</span></span>
          <span><strong className="text-gray-100">{wishlistCount}</strong> <span className="text-gray-500">wishlist</span></span>
        </div>
      </div>
    </div>
  );
}
