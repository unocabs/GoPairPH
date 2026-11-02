export function getBrowseRotation(raw: string | undefined, now = new Date()): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function score(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

/** Rotate older inventory without reshuffling already loaded shoes on each request. */
export function orderBrowseRotation<T extends { id: string }>(shoes: T[], rotation: string): T[] {
  return shoes.map(shoe => ({ shoe, score: score(`${rotation}:${shoe.id}`) }))
    .sort((a, b) => a.score - b.score || a.shoe.id.localeCompare(b.shoe.id))
    .map(row => row.shoe);
}
