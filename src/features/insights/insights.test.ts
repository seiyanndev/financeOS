import { describe, expect, it } from 'vitest';
import type { Goal, IncomeSource, Transaction } from '../../db/types';
import { basisMonth, healthScore, ratingFor, savingsStreakMonths } from './health';
import { monthGrid, paydaysInRange } from './calendar';
import { centavosToDecimal, csvCell, transactionsToCSV } from '../../lib/export';

let n = 0;
const tx = (t: Partial<Transaction> & Pick<Transaction, 'kind' | 'amount' | 'date'>): Transaction => ({
  id: ++n, category: 'x', note: '', createdAt: n, ...t,
});
const P = 100; // ₱1 in centavos

describe('healthScore', () => {
  // October: ₱30,000 in, ₱12,000 spent, ₱6,000 saved (20%). Aug/Sep income ₱30,000 each.
  const base = [
    tx({ kind: 'income', amount: 30_000 * P, date: '2026-08-01' }),
    tx({ kind: 'income', amount: 30_000 * P, date: '2026-09-01' }),
    tx({ kind: 'income', amount: 30_000 * P, date: '2026-10-01' }),
    tx({ kind: 'expense', amount: 12_000 * P, date: '2026-10-05' }),
    tx({ kind: 'goal', amount: 6_000 * P, date: '2026-10-06', goalId: 1 }),
  ];

  it('uses last full month when it had income', () => {
    expect(basisMonth(base, '2026-11-07')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });

  it('falls back to this month so far for new users', () => {
    const fresh = [tx({ kind: 'income', amount: 100, date: '2026-11-02' })];
    expect(basisMonth(fresh, '2026-11-07')).toEqual({ start: '2026-11-01', end: '2026-11-07' });
  });

  it('scores a healthy month at 100 and explains each factor', () => {
    const goal: Goal = { id: 1, name: 'Laptop', target: 60_000 * P, order: 0, createdAt: 0 };
    const h = healthScore(base, [goal], '2026-11-07');
    expect(h.factors.map((f) => [f.key, f.value, f.points && Math.round(f.points)])).toEqual([
      ['savings', '20%', 25],
      ['spending', 'Good', 25], // 40% of income ≤ 50%
      ['stability', 'Stable', 25],
      ['goals', 'Saving', 20], // undated goal, money moved
    ]);
    expect(h.score).toBe(95);
    expect(h.rating).toBe('Very good');
  });

  it('leaves out factors without data and rescales', () => {
    const h = healthScore(base.slice(2), [], '2026-11-07'); // no earlier months, no goals
    expect(h.factors.find((f) => f.key === 'stability')?.points).toBeNull();
    expect(h.factors.find((f) => f.key === 'goals')?.points).toBeNull();
    expect(h.score).toBe(100); // savings 25 + spending 25 out of 50
  });

  it('judges dated goals against their monthly need', () => {
    // Needs ₱54,000 over ~9 months from Oct 1 → ₱6,000/month; ₱3,000 moved → half.
    const goal: Goal = { id: 1, name: 'Laptop', target: 54_000 * P, targetDate: '2027-07-01', order: 0, createdAt: 0 };
    const txs = [...base.slice(0, 4), tx({ kind: 'goal', amount: 3_000 * P, date: '2026-10-06', goalId: 1 })];
    const g = healthScore(txs, [goal], '2026-11-07').factors.find((f) => f.key === 'goals')!;
    expect(g.value).toBe('A little behind');
    expect(Math.round(g.points!)).toBe(13);
  });

  it('has no score without income', () => {
    const h = healthScore([tx({ kind: 'expense', amount: 100, date: '2026-11-02' })], [], '2026-11-07');
    expect(h.score).toBeNull();
  });

  it('rates bands', () => {
    expect([85, 65, 45, 10].map(ratingFor)).toEqual(['Very good', 'Good', 'Fair', 'Needs attention']);
  });
});

describe('savingsStreakMonths', () => {
  const saveIn = (date: string) => tx({ kind: 'allocation', amount: 100, date });
  it('counts consecutive months, not breaking on an early current month', () => {
    const txs = [saveIn('2026-08-10'), saveIn('2026-09-10'), saveIn('2026-10-10')];
    expect(savingsStreakMonths(txs, '2026-11-03')).toBe(3);
    expect(savingsStreakMonths([...txs, saveIn('2026-11-02')], '2026-11-03')).toBe(4);
  });
  it('stops at a gap', () => {
    expect(savingsStreakMonths([saveIn('2026-07-10'), saveIn('2026-09-10'), saveIn('2026-10-10')], '2026-11-03')).toBe(2);
    expect(savingsStreakMonths([], '2026-11-03')).toBe(0);
  });
});

describe('calendar', () => {
  const main: IncomeSource = { id: 1, name: 'Main Job', amount: 1, intervalDays: 14, anchorDate: '2026-11-12', kind: 'salary' };
  const part: IncomeSource = { id: 2, name: 'Part-Time', amount: 1, intervalDays: 15, anchorDate: '2026-09-03', kind: 'freelance' };

  it('projects paydays backwards and forwards from the anchor', () => {
    expect(paydaysInRange([main, part], { start: '2026-10-01', end: '2026-10-31' }).map((p) => [p.date, p.source.id])).toEqual([
      ['2026-10-01', 1], ['2026-10-03', 2], ['2026-10-15', 1], ['2026-10-18', 2], ['2026-10-29', 1],
    ]);
  });

  it('lays out a Sunday-first grid', () => {
    const grid = monthGrid({ start: '2026-10-01', end: '2026-10-31' }); // Oct 1 2026 is a Thursday
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(grid.length).toBe(4 + 31);
  });
});

describe('CSV export', () => {
  it('formats centavos without floats', () => {
    expect([35_050, 100, 5, 0, -12_345].map(centavosToDecimal)).toEqual(['350.50', '1.00', '0.05', '0.00', '-123.45']);
  });

  it('escapes and defuses formulas but keeps numbers', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-350.00')).toBe('-350.00');
    expect(csvCell('+63 917')).toBe("'+63 917");
  });

  it('writes one row per transaction, oldest first', () => {
    const csv = transactionsToCSV(
      [
        tx({ kind: 'expense', amount: 35_050, date: '2026-11-07', category: 'Food', note: 'GrabFood' }),
        tx({ kind: 'goal', amount: 200_000, date: '2026-11-06', category: 'Laptop', goalId: 9 }),
      ],
      [],
      [],
    );
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Note,Amount (PHP),Signed amount (PHP),Goal,Income source');
    expect(lines[1]).toBe('2026-11-06,To goal,Laptop,,2000.00,-2000.00,(deleted goal),');
    expect(lines[2]).toBe('2026-11-07,Expense,Food,GrabFood,350.50,-350.50,,');
  });
});
