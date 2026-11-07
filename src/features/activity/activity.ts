import type { Transaction, TransactionKind } from '../../db/types';
import { formatPeso, parsePeso, type Centavos } from '../../lib/money';
import { daysBetween, type ISODate } from '../../lib/dates';
import { byNewest } from '../home/summary';

export type ActivityFilter = 'all' | 'spending' | 'income' | 'goals' | 'aside';

export const FILTER_KINDS: Record<ActivityFilter, TransactionKind | null> = {
  all: null,
  spending: 'expense',
  income: 'income',
  goals: 'goal',
  aside: 'allocation',
};

/** The name a transaction shows as: the goal for transfers, else the note, else the category. */
export function displayName(tx: Transaction, goalName?: string): string {
  if (tx.kind === 'goal') return goalName ?? tx.category;
  return tx.note || tx.category;
}

/** Second line under the name. */
export function kindLabel(tx: Transaction): string {
  if (tx.kind === 'goal') return 'Moved to goal';
  if (tx.kind === 'allocation') return 'Set aside';
  return tx.category;
}

/** Signed display amount: +₱ for income, −₱ for spending, plain for transfers. */
export function displayAmount(tx: Transaction): string {
  if (tx.kind === 'income') return formatPeso(tx.amount, { sign: 'always' });
  if (tx.kind === 'expense') return formatPeso(-tx.amount);
  return formatPeso(tx.amount);
}

/**
 * Search across name, note, category and amount. A query that reads as an amount ("350",
 * "1,350", "₱350.50") also matches transactions of exactly that amount.
 */
export function matchesQuery(tx: Transaction, query: string, goalName?: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [displayName(tx, goalName), tx.note, tx.category, kindLabel(tx)].join(' ').toLowerCase();
  if (haystack.includes(q)) return true;
  const asAmount = /\d/.test(q) ? parsePeso(q) : null;
  return asAmount !== null && asAmount === tx.amount;
}

export interface ActivityQuery {
  filter: ActivityFilter;
  query: string;
  /** Exact expense category, from the Categories sheet. */
  category: string | null;
}

export function filterTransactions(
  txs: readonly Transaction[],
  { filter, query, category }: ActivityQuery,
  goalNames: ReadonlyMap<number | undefined, string>,
): Transaction[] {
  const kind = FILTER_KINDS[filter];
  return txs
    .filter((tx) => {
      if (kind && tx.kind !== kind) return false;
      if (category && (tx.kind !== 'expense' || tx.category !== category)) return false;
      return matchesQuery(tx, query, goalNames.get(tx.goalId));
    })
    .sort(byNewest);
}

export interface DayGroup {
  date: ISODate;
  items: Transaction[];
}

/** Groups already-sorted transactions by day, preserving order. */
export function groupByDay(txs: readonly Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const tx of txs) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  }
  return groups;
}

export interface CategoryTotal {
  category: string;
  amount: Centavos;
  count: number;
}

/** Spending per expense category in [start, end], largest first. */
export function spendingByCategory(txs: readonly Transaction[], start: ISODate, end: ISODate): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const tx of txs) {
    if (tx.kind !== 'expense' || tx.date < start || tx.date > end) continue;
    const row = map.get(tx.category) ?? { category: tx.category, amount: 0, count: 0 };
    row.amount += tx.amount;
    row.count += 1;
    map.set(tx.category, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

export interface MonthSpend {
  spent: Centavos;
  /** Average per elapsed day, rounded to the nearest whole peso. */
  perDay: Centavos;
  top: string | null;
}

export function monthSpend(txs: readonly Transaction[], monthStart: ISODate, today: ISODate): MonthSpend {
  const cats = spendingByCategory(txs, monthStart, today);
  const spent = cats.reduce((s, c) => s + c.amount, 0);
  const days = daysBetween(monthStart, today) + 1;
  const perDay = Math.round(spent / days / 100) * 100;
  return { spent, perDay, top: cats[0]?.category ?? null };
}
