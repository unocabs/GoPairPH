/** One calendar month in Manila, with month-end clamping (Jan 31 → Feb 28/29). */
export function monthlyExpiry(start: string | Date): string {
  const date = new Date(start);
  if (!Number.isFinite(date.getTime()))
    throw Error('Invalid access start date.');
  const local = new Date(date.getTime() + 8 * 3600000),
    year = local.getUTCFullYear(),
    month = local.getUTCMonth();
  const day = Math.min(
    local.getUTCDate(),
    new Date(Date.UTC(year, month + 2, 0)).getUTCDate(),
  );
  return new Date(
    Date.UTC(
      year,
      month + 1,
      day,
      local.getUTCHours() - 8,
      local.getUTCMinutes(),
      local.getUTCSeconds(),
      local.getUTCMilliseconds(),
    ),
  ).toISOString();
}
