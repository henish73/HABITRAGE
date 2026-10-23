/** Local-time date helpers. `toISOString()` is UTC, which shifts the day for part of every day, so it isn't used here. */

export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type DatePreset = 'all' | '7D' | '30D' | '90D' | 'YTD' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

/** Date range for a preset, relative to `now`. "7D" is today plus the six days before it. */
export function presetRange(preset: DatePreset, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysBack = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);

  switch (preset) {
    case '7D':
      return { from: toLocalISO(daysBack(6)), to: toLocalISO(today) };
    case '30D':
      return { from: toLocalISO(daysBack(29)), to: toLocalISO(today) };
    case '90D':
      return { from: toLocalISO(daysBack(89)), to: toLocalISO(today) };
    case 'YTD':
      return { from: toLocalISO(new Date(today.getFullYear(), 0, 1)), to: toLocalISO(today) };
    case 'this_month':
      return {
        from: toLocalISO(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toLocalISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    case 'last_month':
      return {
        from: toLocalISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: toLocalISO(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    default:
      return { from: '', to: '' };
  }
}

/** Puts a reversed range the right way round, so picking the dates in either order works. */
export function normalizeRange(from: string, to: string): DateRange {
  return from && to && from > to ? { from: to, to: from } : { from, to };
}

/** "Oct 1, 2026", from a YYYY-MM-DD string without any timezone drift. */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}
