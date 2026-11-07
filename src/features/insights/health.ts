import type { Goal, Transaction } from '../../db/types';
import { monthRange, type DayRange, type ISODate } from '../../lib/dates';
import { totalsFor } from '../home/summary';
import { goalPlan } from '../goals/plan';

export const MAX_POINTS = 25;

export interface Factor {
  key: 'savings' | 'spending' | 'stability' | 'goals';
  label: string;
  /** 0–25, or null when there isn't enough data (the factor is left out of the score). */
  points: number | null;
  value: string;
}

export interface Health {
  /** 0–100, or null when the basis month has no income to judge against. */
  score: number | null;
  rating: string;
  basis: DayRange;
  factors: Factor[];
}

const lerp = (x: number, x0: number, x1: number) => Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));

export function ratingFor(score: number): string {
  if (score >= 80) return 'Very good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs attention';
}

/** Last full month if it had income; otherwise this month so far (new users). */
export function basisMonth(txs: readonly Transaction[], today: ISODate): DayRange {
  const prev = monthRange(today, -1);
  if (totalsFor(txs, prev.start, prev.end).income > 0) return prev;
  const cur = monthRange(today);
  return { start: cur.start, end: today };
}

export function healthScore(txs: readonly Transaction[], goals: readonly Goal[], today: ISODate): Health {
  const basis = basisMonth(txs, today);
  const m = totalsFor(txs, basis.start, basis.end);
  const factors: Factor[] = [];

  // 1. Savings rate: share of income saved or set aside. 20%+ earns full points.
  const savingsRate = m.income > 0 ? (m.saved + m.setAside) / m.income : 0;
  factors.push({
    key: 'savings',
    label: 'Savings rate',
    points: m.income > 0 ? MAX_POINTS * lerp(savingsRate, 0, 0.2) : null,
    value: m.income > 0 ? `${Math.round(savingsRate * 100)}%` : '—',
  });

  // 2. Spending control: spending as a share of income. ≤50% full points, ≥100% none.
  const spendRatio = m.income > 0 ? m.spent / m.income : 0;
  const spendPts = m.income > 0 ? MAX_POINTS * (1 - lerp(spendRatio, 0.5, 1)) : null;
  factors.push({
    key: 'spending',
    label: 'Spending control',
    points: spendPts,
    value: spendPts === null ? '—' : spendPts >= 18 ? 'Good' : spendPts >= 10 ? 'Fair' : 'Over budget',
  });

  // 3. Income stability: basis month vs the average of the two months before it.
  const earlier = [-1, -2].map((k) => {
    const r = monthRange(basis.start, k);
    return totalsFor(txs, r.start, r.end).income;
  }).filter((x) => x > 0);
  let stabilityPts: number | null = null;
  let stabilityVal = 'Not enough history';
  if (m.income > 0 && earlier.length > 0) {
    const avg = earlier.reduce((s, x) => s + x, 0) / earlier.length;
    const swing = Math.abs(m.income - avg) / avg;
    stabilityPts = MAX_POINTS * (1 - lerp(swing, 0.1, 0.5));
    stabilityVal = swing <= 0.1 ? 'Stable' : swing <= 0.3 ? 'Varies a little' : 'Unsteady';
  }
  factors.push({ key: 'stability', label: 'Income stability', points: stabilityPts, value: stabilityVal });

  // 4. Goal progress: for goals with a target date, did you move the monthly amount they need?
  const transfers = txs.filter((t) => t.kind === 'goal');
  const inBasis = transfers.filter((t) => t.date >= basis.start && t.date <= basis.end);
  let goalPts: number | null = null;
  let goalVal = 'No goals yet';
  if (goals.length > 0) {
    let need = 0;
    let moved = 0;
    for (const g of goals) {
      if (!g.targetDate) continue;
      // Judge against what was needed at the start of the basis month.
      const savedBefore = transfers.filter((t) => t.goalId === g.id && t.date < basis.start).reduce((s, t) => s + t.amount, 0);
      const plan = goalPlan(savedBefore, g.target, g.targetDate, basis.start);
      if (plan.status !== 'on-track') continue;
      need += plan.perMonth;
      moved += inBasis.filter((t) => t.goalId === g.id).reduce((s, t) => s + t.amount, 0);
    }
    if (need > 0) {
      const ratio = moved / need;
      goalPts = MAX_POINTS * Math.min(1, ratio);
      goalVal = ratio >= 1 ? 'On track' : ratio >= 0.5 ? 'A little behind' : 'Behind';
    } else {
      // No dated goals: reward simply putting something toward them.
      const any = inBasis.length > 0;
      goalPts = any ? 20 : 5;
      goalVal = any ? 'Saving' : 'Nothing moved';
    }
  }
  factors.push({ key: 'goals', label: 'Goal progress', points: goalPts, value: goalVal });

  const scored = factors.filter((f) => f.points !== null);
  if (m.income <= 0 || scored.length === 0) return { score: null, rating: 'Not enough data yet', basis, factors };
  const score = Math.round((scored.reduce((s, f) => s + f.points!, 0) / (scored.length * MAX_POINTS)) * 100);
  return { score, rating: ratingFor(score), basis, factors };
}

/**
 * Months in a row (ending with the latest month that has activity, at most last month or this
 * month) in which something was saved to a goal or set aside.
 */
export function savingsStreakMonths(txs: readonly Transaction[], today: ISODate): number {
  const saved = (offset: number) => {
    const r = monthRange(today, offset);
    const t = totalsFor(txs, r.start, r.end);
    return t.saved + t.setAside > 0;
  };
  // This month still counts as "in progress": don't break the streak just because it's early.
  let offset = saved(0) ? 0 : -1;
  let streak = 0;
  while (streak < 600 && saved(offset)) {
    streak++;
    offset--;
  }
  return streak;
}
