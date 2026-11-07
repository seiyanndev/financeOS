import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addDays, daysBetween, fromISODate, monthRange, toISODate } from '../../lib/dates';
import { byNewest, nextPayDate, totalsFor } from '../home/summary';

export function useMoneyData() {
  return useLiveQuery(async () => {
    const today = toISODate(new Date());
    const [txs, sources] = await Promise.all([db.transactions.toArray(), db.incomeSources.toArray()]);

    const cur = monthRange(today);
    const month = totalsFor(txs, cur.start, cur.end);
    const incomeThisMonth = txs.filter((t) => t.kind === 'income' && t.date >= cur.start && t.date <= cur.end);

    // Same like-for-like comparison as Home: 1st..today vs 1st..same day last month.
    const prev = monthRange(today, -1);
    const prevCutoff = addDays(prev.start, fromISODate(today).getDate() - 1);
    const soFar = totalsFor(txs, cur.start, today).income;
    const before = totalsFor(txs, prev.start, prevCutoff < prev.end ? prevCutoff : prev.end).income;
    const incomeChangePct = before > 0 ? ((soFar - before) / before) * 100 : null;

    const paydays = sources
      .map((source) => {
        const date = nextPayDate(source, today);
        return { source, date, daysAway: daysBetween(today, date) };
      })
      .sort((a, b) => a.daysAway - b.daysAway);

    return {
      today,
      monthStart: cur.start,
      month,
      incomeCount: incomeThisMonth.length,
      incomeChangePct,
      paydays,
      received: incomeThisMonth.sort(byNewest),
    };
  });
}
