import { createServiceClient } from '@/lib/supabase/server';
import { formatListingName, getListingPath } from '@/lib/utils';

export interface ListingDailyViewCount {
  date: string;
  views: number;
}

export interface ListingViewSummary {
  listingId: string;
  slug: string | null;
  listingName: string;
  sellerName: string;
  shopName: string | null;
  listingPath: string;
  totalViews: number;
  dailyViews: ListingDailyViewCount[];
}

interface ListingViewTotalRow {
  listing_id: string;
  total_views: number;
  shoes?: {
    id: string;
    slug: string | null;
    brand: string;
    model: string;
    profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
    shops?: { name: string | null } | { name: string | null }[] | null;
  } | null;
}

interface DailyCountRow {
  listing_id: string;
  view_date: string;
  views: number;
}

export function getManilaDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getDashboardViewWindow(days = 14): { startDate: string; endDate: string } {
  const endDate = getManilaDateString();
  return { startDate: addDaysToDateString(endDate, -(days - 1)), endDate };
}

export function getWeeklyReportWindow(): { startDate: string; endDate: string; reportKey: string } {
  const endDate = getManilaDateString();
  const startDate = addDaysToDateString(endDate, -6);
  return { startDate, endDate, reportKey: `${startDate}_${endDate}` };
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getListingViewSummaries({
  startDate,
  endDate,
  limit = 100,
}: {
  startDate: string;
  endDate: string;
  limit?: number;
}): Promise<ListingViewSummary[]> {
  const service = createServiceClient();

  const [{ data: totalRows }, { data: dailyRows }] = await Promise.all([
    service
      .from('listing_view_totals')
      .select('listing_id, total_views, shoes!inner(id, slug, brand, model, profiles(display_name), shops(name))')
      .gt('total_views', 0)
      .order('total_views', { ascending: false })
      .limit(limit),
    service
      .from('listing_daily_view_counts')
      .select('listing_id, view_date, views')
      .gte('view_date', startDate)
      .lte('view_date', endDate),
  ]);

  const dailyByListing = new Map<string, ListingDailyViewCount[]>();
  for (const row of (dailyRows as DailyCountRow[] | null) ?? []) {
    const current = dailyByListing.get(row.listing_id) ?? [];
    current.push({ date: row.view_date, views: row.views });
    dailyByListing.set(row.listing_id, current);
  }

  return ((totalRows as ListingViewTotalRow[] | null) ?? []).map(row => {
    const shoe = row.shoes;
    const profile = one(shoe?.profiles);
    const shop = one(shoe?.shops);
    const listing = { id: shoe?.id ?? row.listing_id, slug: shoe?.slug ?? null };
    return {
      listingId: row.listing_id,
      slug: shoe?.slug ?? null,
      listingName: shoe ? formatListingName(shoe.brand, shoe.model) : 'Unknown listing',
      sellerName: profile?.display_name || 'Unknown seller',
      shopName: shop?.name || null,
      listingPath: getListingPath(listing),
      totalViews: row.total_views,
      dailyViews: (dailyByListing.get(row.listing_id) ?? []).sort((a, b) => b.date.localeCompare(a.date)),
    };
  });
}
