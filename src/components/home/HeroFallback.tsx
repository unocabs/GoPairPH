import { createPublicClient } from '@/lib/supabase/server';

interface PulseStats {
  totalActive: number;
  forSale: number;
  donations: number;
  totalKm: number;
  weekDelta: number;
  todayListers: number;
  recentAvatars: { initials: string; color: string }[];
}

const AVATAR_COLORS = [
  'bg-orange-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-cyan-500',
];

function initialsOf(name: string | null | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
  return km.toString();
}

async function getPulseStats(): Promise<PulseStats> {
  const supabase = createPublicClient();

  // Active listings split by type
  const { data: activeShoes } = await supabase
    .from('shoes')
    .select('listing_type, mileage_km, created_at')
    .eq('status', 'active');

  const totalActive = activeShoes?.length ?? 0;
  const forSale = activeShoes?.filter(s => s.listing_type === 'for_sale').length ?? 0;
  const donations = activeShoes?.filter(s => s.listing_type === 'donate').length ?? 0;
  const totalKm = (activeShoes ?? []).reduce(
    (sum, s) => sum + (typeof s.mileage_km === 'number' ? s.mileage_km : 0),
    0,
  );

  // Listings created in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekDelta = (activeShoes ?? []).filter(
    s => new Date(s.created_at) >= weekAgo,
  ).length;

  // Listings created today (for the bottom strip)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayListings = (activeShoes ?? []).filter(
    s => new Date(s.created_at) >= todayStart,
  );

  // Recent listers' avatars (last 4 unique by name)
  const { data: recent } = await supabase
    .from('shoes')
    .select('seller_id, profiles(display_name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  const seenSellers = new Set<string>();
  const recentAvatars: PulseStats['recentAvatars'] = [];
  for (const row of recent ?? []) {
    if (seenSellers.has(row.seller_id)) continue;
    seenSellers.add(row.seller_id);
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const name = (profile as { display_name?: string } | null)?.display_name ?? null;
    recentAvatars.push({
      initials: initialsOf(name),
      color: AVATAR_COLORS[recentAvatars.length % AVATAR_COLORS.length],
    });
    if (recentAvatars.length >= 4) break;
  }

  return {
    totalActive,
    forSale,
    donations,
    totalKm: Math.round(totalKm),
    weekDelta,
    todayListers: todayListings.length,
    recentAvatars,
  };
}

export async function HeroFallback() {
  const stats = await getPulseStats();
  const extraSellers = Math.max(0, stats.todayListers - stats.recentAvatars.length);

  return (
    <div
      className="relative w-full max-w-[380px] rounded-[28px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_50px_rgba(20,184,166,0.12)] backdrop-blur-md"
      style={{
        background:
          'linear-gradient(160deg, rgba(20,184,166,0.1), rgba(15,23,42,0.72) 58%, rgba(2,6,23,0.82))',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">
            Marketplace Pulse
          </span>
        </div>
        <span className="text-[11px] text-gray-500 font-mono">Live · Pampanga</span>
      </div>

      {/* Big metric */}
      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-gray-100 tracking-tight tabular-nums">
            {stats.totalActive}
          </span>
          <span className="text-sm text-gray-400">
            {stats.totalActive === 1 ? 'pair available' : 'pairs available'}
          </span>
        </div>
        {stats.weekDelta > 0 && (
          <div className="mt-1 flex items-center gap-2 text-xs text-teal-400">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M7 17l5-5 5 5M7 7l5-5 5 5" />
            </svg>
            <span className="font-semibold">
              +{stats.weekDelta} this week
            </span>
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="text-xl font-bold tabular-nums text-gray-100">
            {stats.forSale}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
            For Sale
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="text-xl font-bold tabular-nums text-green-400">
            {stats.donations}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
            Donations
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
          <div className="text-xl font-bold tabular-nums text-teal-400">
            {formatKm(stats.totalKm)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
            KM Logged
          </div>
        </div>
      </div>

      {/* Footer — today's listers */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-800/80">
        {stats.recentAvatars.length > 0 ? (
          <>
            <div className="flex -space-x-2">
              {stats.recentAvatars.map((a, i) => (
                <div
                  key={i}
                  className={`h-6 w-6 rounded-full ${a.color} border-2 border-gray-900 flex items-center justify-center text-[9px] font-bold text-white`}
                >
                  {a.initials}
                </div>
              ))}
              {extraSellers > 0 && (
                <div className="h-6 w-6 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-[9px] font-bold text-gray-300">
                  +{extraSellers}
                </div>
              )}
            </div>
            <span className="text-[11px] text-gray-500">
              {stats.todayListers > 0
                ? `${stats.todayListers} runner${stats.todayListers === 1 ? '' : 's'} listed today`
                : 'Recent listers'}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-gray-500">
            Be the first to list this week.
          </span>
        )}
      </div>
    </div>
  );
}
