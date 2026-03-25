/** Client-side search + slice — backend returns 500 when PageIndex/PageSize/Sort/Search are sent. */

export function clientFilterSearch<T>(
  items: T[],
  search: string,
  stringify: (item: T) => string
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => stringify(item).toLowerCase().includes(q));
}

export function clientPaginate<T>(items: T[], pageIndex: number, pageSize: number): T[] {
  const start = Math.max(0, pageIndex) * pageSize;
  return items.slice(start, start + pageSize);
}

export function clientTotalPages(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}
