export const dynamic = 'force-dynamic';

import { WishlistForm } from '@/components/wishlist/WishlistForm';

export default function NewPairRequestPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-100">
          Post a Pair Request
        </h1>

        <div className="group relative">
          <button
            type="button"
            className="text-gray-400 transition-colors hover:text-gray-300"
            aria-label="Help"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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

          <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-72 -translate-x-1/2 group-hover:block">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-200 shadow-xl">
              <p className="mb-3">
                Not sure what to post? Check out this quick video guide:
              </p>
              <a
                href="https://www.youtube.com/watch?v=kUzKTKVJ6G0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 transition-colors hover:text-blue-300"
              >
                Watch the tutorial on YouTube
                <span className="text-xs opacity-75">↗</span>
              </a>
            </div>

            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-gray-800" />
          </div>
        </div>
      </div>

      <p className="mb-8 text-sm text-gray-500">
        Tell the community what running shoe you&apos;re looking for. Anyone can drop a link when they find one available.
      </p>

      <WishlistForm />
    </div>
  );
}
