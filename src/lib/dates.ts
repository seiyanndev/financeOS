/**
 * Dates are stored as local calendar days, 'YYYY-MM-DD'. That keeps "Sep 23" meaning
 * Sep 23 wherever the phone is, and makes string comparison sort correctly.
 */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of an ISO day. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole calendar days from a to b (b − a). DST-safe because it works on UTC dates. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86_400_000);
}

export interface DayRange {
  start: ISODate; // inclusive
  end: ISODate; // inclusive
}

export function monthRange(iso: ISODate, monthOffset = 0): DayRange {
  const d = fromISODate(iso);
  const first = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { start: toISODate(first), end: toISODate(last) };
}

export function inRange(iso: ISODate, r: DayRange): boolean {
  return iso >= r.start && iso <= r.end;
}

const shortDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const headerDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' });

/** "Sep 23" */
export const formatShortDay = (iso: ISODate) => shortDay.format(fromISODate(iso));
/** "Mon, Sep 23" */
export const formatHeaderDay = (iso: ISODate) => headerDay.format(fromISODate(iso));
/** "OCT" */
export const formatMonthTag = (iso: ISODate) => monthShort.format(fromISODate(iso)).toUpperCase();

/** "today" / "tomorrow" / "in 5 days" */
export function formatDaysUntil(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
