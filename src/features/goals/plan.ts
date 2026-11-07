import type { Centavos } from '../../lib/money';
import { daysBetween, type ISODate } from '../../lib/dates';

export type GoalPlan =
  | { status: 'reached' }
  | { status: 'no-date' }
  | { status: 'overdue'; left: Centavos }
  | { status: 'on-track'; left: Centavos; months: number; perMonth: Centavos };

const AVG_DAYS_PER_MONTH = 30.436875; // 365.2425 / 12

/**
 * What it takes to hit a goal by its target date. `perMonth` is rounded *up* to the whole peso,
 * so following it never leaves you a few centavos short.
 */
export function goalPlan(saved: Centavos, target: Centavos, targetDate: ISODate | undefined, today: ISODate): GoalPlan {
  const left = target - saved;
  if (left <= 0) return { status: 'reached' };
  if (!targetDate) return { status: 'no-date' };
  const days = daysBetween(today, targetDate);
  if (days < 0) return { status: 'overdue', left };
  const months = Math.max(1, Math.ceil(days / AVG_DAYS_PER_MONTH));
  const perMonth = Math.ceil(left / months / 100) * 100;
  return { status: 'on-track', left, months, perMonth };
}
