import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { toISODate } from '../../lib/dates';
import { goalProgress } from '../home/summary';
import { goalPlan } from './plan';

export function useGoalsData() {
  return useLiveQuery(async () => {
    const today = toISODate(new Date());
    const [goals, transfers] = await Promise.all([
      db.goals.orderBy('order').toArray(),
      db.transactions.where('kind').equals('goal').toArray(),
    ]);
    const items = goals.map((g) => {
      const p = goalProgress(g, transfers);
      return { ...p, plan: goalPlan(p.saved, g.target, g.targetDate, today) };
    });
    // Totals cap each goal at its target, so overshooting one goal can't hide another's gap.
    const saved = items.reduce((s, i) => s + Math.min(i.saved, i.goal.target), 0);
    const target = items.reduce((s, i) => s + i.goal.target, 0);
    return { items, saved, target };
  });
}

export type GoalItem = NonNullable<ReturnType<typeof useGoalsData>>['items'][number];
