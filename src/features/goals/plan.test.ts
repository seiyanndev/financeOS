import { describe, expect, it } from 'vitest';
import { goalPlan } from './plan';

describe('goalPlan', () => {
  it('is reached at or past the target', () => {
    expect(goalPlan(6_000_000, 6_000_000, '2027-01-01', '2026-09-23')).toEqual({ status: 'reached' });
    expect(goalPlan(7_000_000, 6_000_000, undefined, '2026-09-23')).toEqual({ status: 'reached' });
  });

  it('has no plan without a date', () => {
    expect(goalPlan(0, 100, undefined, '2026-09-23')).toEqual({ status: 'no-date' });
  });

  it('flags a passed date', () => {
    expect(goalPlan(2_500_000, 6_000_000, '2026-09-01', '2026-09-23')).toEqual({ status: 'overdue', left: 3_500_000 });
  });

  it('splits what is left over the months remaining, rounded up to the peso', () => {
    // ₱35,000 left, ~6 months (Sep 23 → Mar 23) → ₱5,833.33 → ₱5,834
    const p = goalPlan(2_500_000, 6_000_000, '2027-03-23', '2026-09-23');
    expect(p).toEqual({ status: 'on-track', left: 3_500_000, months: 6, perMonth: 583_400 });
  });

  it('treats a date this month (or today) as one month', () => {
    const p = goalPlan(0, 1_000_000, '2026-09-23', '2026-09-23');
    expect(p).toMatchObject({ months: 1, perMonth: 1_000_000 });
  });

  it('never leaves you short', () => {
    const p = goalPlan(0, 100_001, '2026-12-23', '2026-09-23'); // ₱1,000.01 over 3 months
    if (p.status !== 'on-track') throw new Error('expected on-track');
    expect(p.perMonth * p.months).toBeGreaterThanOrEqual(100_001);
    expect(p.perMonth % 100).toBe(0);
  });
});
