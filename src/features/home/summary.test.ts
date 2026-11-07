import { describe, expect, it } from 'vitest';
import type { IncomeSource, Transaction } from '../../db/types';
import { goalProgress, homeSummary, nextPayDate, nextPayday } from './summary';
import { initials } from '../../lib/text';
import { daysBetween } from '../../lib/dates';

let n = 0;
const tx = (t: Partial<Transaction> & Pick<Transaction, 'kind' | 'amount' | 'date'>): Transaction => ({
  category: 'x',
  note: '',
  createdAt: n++,
  ...t,
});

describe('homeSummary', () => {
  const txs = [
    tx({ kind: 'income', amount: 3_400_000, date: '2026-09-03' }),
    tx({ kind: 'expense', amount: 2_035_000, date: '2026-09-10' }),
    tx({ kind: 'goal', amount: 850_000, date: '2026-09-12', goalId: 1 }),
    tx({ kind: 'allocation', amount: 315_000, date: '2026-09-15' }),
    tx({ kind: 'expense', amount: 99_999, date: '2026-08-31' }), // previous month, excluded
  ];

  it('totals the current month', () => {
    const { month } = homeSummary(txs, '2026-09-23');
    expect(month).toEqual({
      income: 3_400_000,
      spent: 2_035_000,
      saved: 850_000,
      setAside: 315_000,
      available: 200_000,
    });
  });

  it('compares to the same point last month', () => {
    const withPrev = [
      ...txs,
      tx({ kind: 'income', amount: 1_000_000, date: '2026-08-02' }),
      tx({ kind: 'income', amount: 9_000_000, date: '2026-08-28' }), // after Aug 23, ignored
    ];
    // Sep 1–23 available = 200,000 − 0 (Aug 31 expense is last month) ; Aug 1–23 = 1,000,000 − 0
    const { changePct } = homeSummary(withPrev, '2026-09-23');
    expect(changePct).toBeCloseTo(-80);
  });

  it('has no trend without last-month data', () => {
    expect(homeSummary(txs.slice(0, 4), '2026-09-23').changePct).toBeNull();
  });
});

describe('paydays', () => {
  const main: IncomeSource = { id: 1, name: 'Main Job', amount: 1_300_000, intervalDays: 14, anchorDate: '2026-09-03', kind: 'salary' };
  const part: IncomeSource = { id: 2, name: 'Part-Time', amount: 400_000, intervalDays: 15, anchorDate: '2026-10-03', kind: 'freelance' };

  it('rolls an old anchor forward', () => {
    expect(nextPayDate(main, '2026-09-23')).toBe('2026-10-01');
    expect(nextPayDate(main, '2026-10-01')).toBe('2026-10-01');
    expect(nextPayDate(main, '2026-10-02')).toBe('2026-10-15');
  });

  it('keeps a future anchor', () => expect(nextPayDate(part, '2026-09-23')).toBe('2026-10-03'));

  it('picks the soonest source', () => {
    const p = nextPayday([part, main], '2026-09-26');
    expect(p?.source.name).toBe('Main Job');
    expect(p?.daysAway).toBe(5);
  });

  it('counts days across DST changes', () => expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31));
});

describe('goalProgress', () => {
  it('sums only that goal and floors the percent', () => {
    const g = { id: 1, name: 'Laptop', target: 6_000_000, order: 0, createdAt: 0 };
    const p = goalProgress(g, [
      tx({ kind: 'goal', amount: 2_300_000, date: '2026-08-01', goalId: 1 }),
      tx({ kind: 'goal', amount: 200_000, date: '2026-09-22', goalId: 1 }),
      tx({ kind: 'goal', amount: 500_000, date: '2026-09-22', goalId: 2 }),
    ]);
    expect(p.saved).toBe(2_500_000);
    expect(p.pct).toBe(41);
  });
});

describe('initials', () => {
  it.each([
    ['GrabFood', 'GF'],
    ['Electricity bill', 'EB'],
    ['Part-Time Job', 'PT'],
    ['rent', 'RE'],
  ])('%s → %s', (name, expected) => expect(initials(name)).toBe(expected));
});
