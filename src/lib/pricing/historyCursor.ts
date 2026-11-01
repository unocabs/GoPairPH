export interface HistoryRow {
  id: string;
  created_at: string;
}
export function historyCursor(row: HistoryRow) {
  return `${row.created_at}|${row.id}`;
}
export function parseHistoryCursor(value: string) {
  const [date, id, ...extra] = value.split('|');
  if (
    extra.length ||
    !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|\+00:00)$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    return null;
  return { date, id };
}
