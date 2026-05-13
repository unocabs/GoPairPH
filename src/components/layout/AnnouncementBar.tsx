export function AnnouncementBar() {
  const message = "Pampanga's running shoe hub — open to local and nearby sellers who serve Pampanga runners.";

  return (
    <div className="overflow-hidden border-b border-gray-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex w-max animate-marquee-left whitespace-nowrap text-xs font-semibold text-white sm:text-sm">
          <span className="px-8">{message}</span>
          <span className="px-8" aria-hidden="true">{message}</span>
        </div>
      </div>
    </div>
  );
}
