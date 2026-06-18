'use client';

import { type Profile } from '@/types';
import { formatProfileLocation, formatRelativeDate } from '@/lib/utils';
import { getFacebookContactUrl } from '@/lib/facebook';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface ProfileHeaderProps {
  profile: Profile;
  listingCount: number;
  wishlistCount: number;
  /** Completed sales count, shown as a trust signal when > 0. */
  completedSales?: number;
  isOwnProfile?: boolean;
  onEditLocation?: () => void;
}

export function ProfileHeader({ profile, listingCount, wishlistCount, completedSales, isOwnProfile, onEditLocation }: ProfileHeaderProps) {
  const facebookUrl = getFacebookContactUrl(profile.fb_username);
  const profileLocation = formatProfileLocation(profile);

  return (
    <div className="flex items-start gap-3 text-left sm:gap-5">
      <Avatar
        src={profile.avatar_url}
        alt={profile.display_name}
        size={72}
        className="shrink-0 border-2 border-teal-400/40 shadow-[0_0_28px_rgba(20,184,166,0.14)] sm:border-4"
        fallbackClassName="shrink-0"
      />

      <div className="min-w-0 flex-1 sm:w-auto">
        <h1 className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-xl font-bold leading-tight text-gray-100 sm:gap-2 sm:text-2xl">
          {profile.display_name}
          {profile.is_verified && <VerifiedBadge size="lg" />}
        </h1>
        {isOwnProfile && onEditLocation ? (
          <button
            type="button"
            onClick={onEditLocation}
            aria-label={profileLocation ? `Edit location: ${profileLocation}` : 'Add location'}
            className={`mt-0.5 flex min-h-8 max-w-full items-center gap-1 rounded-md pr-2 text-left text-sm transition-colors hover:bg-gray-800 ${profileLocation ? 'text-gray-400 hover:text-gray-200' : 'font-semibold text-teal-300 hover:text-teal-200'}`}
          >
            <LocationIcon />
            <span className="truncate">{profileLocation || 'Add Location'}</span>
            <svg className="h-3.5 w-3.5 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.83A4 4 0 019 15H7v-2a4 4 0 011.172-2.828L9 11z" />
            </svg>
          </button>
        ) : profileLocation ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
            <LocationIcon />
            {profileLocation}
          </p>
        ) : null}
        {facebookUrl ? (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            {profile.fb_username}
          </a>
        ) : null}
        <p className={`mt-1 text-xs text-gray-500 ${isOwnProfile ? 'hidden sm:block' : ''}`}>Member since {formatRelativeDate(profile.created_at)}</p>
        {!!completedSales && completedSales > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 text-xs font-semibold text-teal-300">
            <span aria-hidden>🤝</span>
            {completedSales} successful deal{completedSales === 1 ? '' : 's'}
          </p>
        )}
        <div className={`mt-3 gap-4 text-sm ${isOwnProfile ? 'hidden' : 'flex'}`}>
          <span><strong className="text-gray-100">{listingCount}</strong> <span className="text-gray-500">listings</span></span>
          <span><strong className="text-gray-100">{wishlistCount}</strong> <span className="text-gray-500">looking for</span></span>
        </div>
        {isOwnProfile && (
          <p className="mt-2 hidden max-w-xl text-xs leading-5 text-gray-500 lg:block">
            Your seller profile is a reusable storefront for every link you share. Facebook posts
            move fast; your Go Pair PH profile keeps your listings, history, and trust signals together.
          </p>
        )}
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
