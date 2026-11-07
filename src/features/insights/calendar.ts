import type { IncomeSource } from '../../db/types';
import { addDays, daysBetween, fromISODate, type DayRange, type ISODate } from '../../lib/dates';

export interface ProjectedPayday {
  date: ISODate;
  source: IncomeSource;
}

/** Every projected payday of every source within [start, end], in date order. */
export function paydaysInRange(sources: readonly IncomeSource[], range: DayRange): ProjectedPayday[] {
  const out: ProjectedPayday[] = [];
  for (const source of sources) {
    const step = Math.max(1, source.intervalDays);
    // First occurrence on/after range.start, counting from the anchor in either direction.
    const k = Math.ceil(daysBetween(source.anchorDate, range.start) / step);
    for (let d = addDays(source.anchorDate, k * step); d <= range.end; d = addDays(d, step)) {
      out.push({ date: d, source });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.source.name.localeCompare(b.source.name)));
}

/**
 * Calendar cells for a month, weeks starting on Sunday as in the design.
 * Leading blanks are `null`.
 */
export function monthGrid(range: DayRange): (ISODate | null)[] {
  const lead = fromISODate(range.start).getDay();
  const days = daysBetween(range.start, range.end) + 1;
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(range.start, i))];
}
