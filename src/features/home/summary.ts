import type { Goal, IncomeSource, Transaction } from '../../db/types';
import type { Centavos } from '../../lib/money';
import { addDays, daysBetween, fromISODate, monthRange, type ISODate } from '../../lib/dates';

export interface MonthTotals {
  income: Centavos;
  spent: Centavos;
  saved: Centavos;
  setAside: Centavos;
  /** income − spent − saved − setAside. Can go negative when overspent. */
  available: Centavos;
}

export function totalsFor(txs: readonly Transaction[], start: ISODate, end: ISODate): MonthTotals {
  const t = { income: 0, spent: 0, saved: 0, setAside: 0 };
  for (const tx of txs) {
    if (tx.date < start || tx.date > end) continue;
    if (tx.kind === 'income') t.income += tx.amount;
    else if (tx.kind === 'expense') t.spent += tx.amount;
    else if (tx.kind === 'goal') t.saved += tx.amount;
    else t.setAside += tx.amount;
  }
  return { ...t, available: t.income - t.spent - t.saved - t.setAside };
}

export interface HomeSummary {
  month: MonthTotals;
  /** % change of available vs the same days of last month; null when there's nothing to compare. */
  changePct: number | null;
}

export function homeSummary(txs: readonly Transaction[], today: ISODate): HomeSummary {
  const cur = monthRange(today);
  // The headline covers the whole month, so future-dated entries already logged still count.
  const month = totalsFor(txs, cur.start, cur.end);

  // The trend compares like with like: 1st..today now vs 1st..same day last month.
  const prev = monthRange(today, -1);
  const prevCutoff = addDays(prev.start, fromISODate(today).getDate() - 1);
  const soFar = totalsFor(txs, cur.start, today);
  const before = totalsFor(txs, prev.start, prevCutoff < prev.end ? prevCutoff : prev.end);
  const changePct =
    before.available > 0 ? ((soFar.available - before.available) / before.available) * 100 : null;

  return { month, changePct };
}

export interface Payday {
  source: IncomeSource;
  date: ISODate;
  daysAway: number;
}

/** First payday on or after `today` for a recurring source. */
export function nextPayDate(source: IncomeSource, today: ISODate): ISODate {
  const interval = Math.max(1, source.intervalDays);
  const diff = daysBetween(source.anchorDate, today);
  if (diff <= 0) return source.anchorDate;
  const periods = Math.ceil(diff / interval);
  return addDays(source.anchorDate, periods * interval);
}

export function nextPayday(sources: readonly IncomeSource[], today: ISODate): Payday | null {
  let best: Payday | null = null;
  for (const source of sources) {
    const date = nextPayDate(source, today);
    const daysAway = daysBetween(today, date);
    if (!best || daysAway < best.daysAway) best = { source, date, daysAway };
  }
  return best;
}

export interface GoalProgress {
  goal: Goal;
  saved: Centavos;
  pct: number; // 0–100, whole number, capped at 100
}

export function goalProgress(goal: Goal, txs: readonly Transaction[]): GoalProgress {
  let saved = 0;
  for (const tx of txs) if (tx.kind === 'goal' && tx.goalId === goal.id) saved += tx.amount;
  const pct = goal.target > 0 ? Math.min(100, Math.floor((saved / goal.target) * 100)) : 0;
  return { goal, saved, pct };
}

/** Newest first: by day, then by when it was entered. */
export function byNewest(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.createdAt - a.createdAt;
}
