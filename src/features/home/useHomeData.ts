import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { toISODate } from '../../lib/dates';
import { byNewest, goalProgress, homeSummary, nextPayday } from './summary';

/** Everything Home renders, recomputed live whenever any table changes. `undefined` while loading. */
export function useHomeData() {
  return useLiveQuery(async () => {
    const today = toISODate(new Date());
    const [txs, goals, sources, nameSetting] = await Promise.all([
      db.transactions.toArray(),
      db.goals.orderBy('order').toArray(),
      db.incomeSources.toArray(),
      db.settings.get('displayName'),
    ]);

    const goalNames = new Map(goals.map((g) => [g.id, g.name]));
    const goalItems = goals.map((g) => goalProgress(g, txs));
    const topGoal = goalItems[0] ?? null;

    return {
      today,
      displayName: nameSetting?.value.trim() || '',
      isEmpty: txs.length === 0 && goals.length === 0 && sources.length === 0,
      summary: homeSummary(txs, today),
      payday: nextPayday(sources, today),
      topGoal,
      goals: goalItems,
      recent: [...txs].sort(byNewest).slice(0, 5),
      goalNames,
    };
  });
}

export type HomeData = NonNullable<ReturnType<typeof useHomeData>>;
