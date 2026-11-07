import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../db/types';
import { displayAmount, filterTransactions, groupByDay, matchesQuery, monthSpend, spendingByCategory } from './activity';

let n = 0;
const tx = (t: Partial<Transaction> & Pick<Transaction, 'kind' | 'amount' | 'date'>): Transaction => ({
  id: ++n, category: 'Food', note: '', createdAt: n, ...t,
});

const grab = tx({ kind: 'expense', amount: 35_000, date: '2026-09-23', note: 'GrabFood' });
const bill = tx({ kind: 'expense', amount: 135_000, date: '2026-09-20', category: 'Bills', note: 'Electricity bill' });
const grocery = tx({ kind: 'expense', amount: 120_050, date: '2026-09-14', note: 'Grocery' });
const pay = tx({ kind: 'income', amount: 400_000, date: '2026-09-15', category: 'Part-Time Job' });
const save = tx({ kind: 'goal', amount: 200_000, date: '2026-09-22', category: 'Laptop', goalId: 7 });
const aside = tx({ kind: 'allocation', amount: 50_000, date: '2026-09-22', category: 'Set aside' });
const all = [grocery, pay, save, aside, grab, bill];
const goalNames = new Map<number | undefined, string>([[7, 'Laptop Fund']]);

describe('matchesQuery', () => {
  it('matches name, note and category case-insensitively', () => {
    expect(matchesQuery(grab, 'grab')).toBe(true);
    expect(matchesQuery(bill, 'BILLS')).toBe(true);
    expect(matchesQuery(save, 'laptop fund', 'Laptop Fund')).toBe(true);
    expect(matchesQuery(grab, 'rent')).toBe(false);
  });
  it('matches exact amounts in any format', () => {
    expect(matchesQuery(grab, '350')).toBe(true);
    expect(matchesQuery(bill, '1,350')).toBe(true);
    expect(matchesQuery(bill, '₱1350.00')).toBe(true);
    expect(matchesQuery(grocery, '1200.5')).toBe(true);
    expect(matchesQuery(grab, '35')).toBe(false);
  });
});

describe('filterTransactions', () => {
  it('filters by kind and sorts newest first', () => {
    const r = filterTransactions(all, { filter: 'spending', query: '', category: null }, goalNames);
    expect(r.map((t) => t.note)).toEqual(['GrabFood', 'Electricity bill', 'Grocery']);
  });
  it('filters by category and query together', () => {
    expect(filterTransactions(all, { filter: 'all', query: '', category: 'Food' }, goalNames)).toEqual([grab, grocery]);
    expect(filterTransactions(all, { filter: 'all', query: 'groc', category: 'Food' }, goalNames)).toEqual([grocery]);
  });
  it('has a set-aside filter', () => {
    expect(filterTransactions(all, { filter: 'aside', query: '', category: null }, goalNames)).toEqual([aside]);
  });
});

describe('groupByDay', () => {
  it('groups consecutive days', () => {
    const sorted = filterTransactions(all, { filter: 'all', query: '', category: null }, goalNames);
    expect(groupByDay(sorted).map((g) => [g.date, g.items.length])).toEqual([
      ['2026-09-23', 1], ['2026-09-22', 2], ['2026-09-20', 1], ['2026-09-15', 1], ['2026-09-14', 1],
    ]);
  });
});

describe('spending summaries', () => {
  it('totals by category, largest first', () => {
    expect(spendingByCategory(all, '2026-09-01', '2026-09-30')).toEqual([
      { category: 'Food', amount: 155_050, count: 2 },
      { category: 'Bills', amount: 135_000, count: 1 },
    ]);
  });
  it('averages per elapsed day to the nearest peso', () => {
    // ₱2,900.50 over Sep 1–23 (23 days) = ₱126.11 → ₱126
    expect(monthSpend(all, '2026-09-01', '2026-09-23')).toEqual({ spent: 290_050, perDay: 12_600, top: 'Food' });
  });
});

describe('displayAmount', () => {
  it('signs by kind', () => {
    expect([grab, pay, save].map(displayAmount)).toEqual(['−₱350', '+₱4,000', '₱2,000']);
  });
});
