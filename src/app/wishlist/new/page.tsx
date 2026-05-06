export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { WishlistForm } from '@/components/wishlist/WishlistForm';

async function getProfileId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  return data?.id ?? null;
}

export default async function NewWishlistPage() {
  const profileId = await getProfileId();
  if (!profileId) redirect('/');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-100">
          Post a Wishlist Item
        </h1>

        {/* Tooltip */}
        <div className="group relative">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Help"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 4.01V8"
              />
            </svg>
          </button>

          {/* Tooltip Content */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72">
            <div className="bg-gray-800 text-gray-200 text-sm rounded-lg p-4 shadow-xl border border-gray-700">
              <p className="mb-3">
                Not sure what to post? Check out this quick video guide:
              </p>
              <a
                href="https://www.youtube.com/watch?v=kUzKTKVJ6G0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                🎥 Watch the tutorial on YouTube
                <span className="text-xs opacity-75">↗</span>
              </a>
            </div>

            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-800" />
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-8">
        Let other runners know what shoe you&apos;re looking for.
      </p>

      <AuthGuard>
        <WishlistForm profileId={profileId} />
      </AuthGuard>
    </div>
  );
}
