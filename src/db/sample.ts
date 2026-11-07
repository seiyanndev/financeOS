import { db } from './db';
import type { Transaction } from './types';
import { pesos } from '../lib/money';
import { addDays, toISODate } from '../lib/dates';

/**
 * Demo data mirroring the design references, dated relative to today so it always looks current.
 * Only loaded when the person taps "Load sample data" on an empty Home screen.
 */
export async function loadSampleData(): Promise<void> {
  const today = toISODate(new Date());
  const day = (offset: number) => addDays(today, offset);
  let created = Date.now();

  await db.transaction('rw', [db.transactions, db.goals, db.incomeSources, db.settings], async () => {
    const [mainJob, partTime] = (await db.incomeSources.bulkAdd(
      [
        {
          name: 'Main Job',
          amount: pesos(13_000),
          foreign: { currency: 'AUD', amount: 300_00 },
          intervalDays: 14,
          anchorDate: day(5),
          kind: 'salary',
        },
        { name: 'Part-Time Job', amount: pesos(4_000), intervalDays: 15, anchorDate: day(7), kind: 'freelance' },
      ],
      { allKeys: true },
    )) as number[];

    const [laptop, emergency, japan] = (await db.goals.bulkAdd(
      [
        { name: 'Laptop Fund', target: pesos(60_000), order: 0, createdAt: created },
        { name: 'Emergency Fund', target: pesos(100_000), order: 1, createdAt: created },
        { name: 'Japan Trip', target: pesos(150_000), order: 2, createdAt: created },
      ],
      { allKeys: true },
    )) as number[];

    const tx = (t: Omit<Transaction, 'createdAt' | 'note'> & { note?: string }): Transaction => ({
      note: '',
      ...t,
      createdAt: created++,
    });

    await db.transactions.bulkAdd([
      tx({ kind: 'goal', amount: pesos(23_000), category: 'Laptop Fund', goalId: laptop, date: day(-50) }),
      tx({ kind: 'goal', amount: pesos(18_500), category: 'Emergency Fund', goalId: emergency, date: day(-55) }),
      tx({ kind: 'goal', amount: pesos(35_000), category: 'Japan Trip', goalId: japan, date: day(-60) }),
      tx({ kind: 'income', amount: pesos(12_000), category: 'Main Job', sourceId: mainJob, date: day(-34) }),
      tx({ kind: 'expense', amount: pesos(9_800), category: 'Bills', note: 'Rent share', date: day(-33) }),
      tx({ kind: 'income', amount: pesos(12_000), category: 'Main Job', sourceId: mainJob, date: day(-20) }),
      tx({ kind: 'expense', amount: pesos(9_800), category: 'Bills', note: 'Rent share', date: day(-19) }),
      tx({ kind: 'allocation', amount: pesos(3_150), category: 'Set aside', note: 'Paycheck split', date: day(-19) }),
      tx({ kind: 'income', amount: pesos(4_000), category: 'Part-Time Job', sourceId: partTime, date: day(-8) }),
      tx({ kind: 'income', amount: pesos(12_000), category: 'Main Job', sourceId: mainJob, date: day(-6) }),
      tx({ kind: 'expense', amount: pesos(2_450), category: 'Shopping', note: 'Groceries', date: day(-5) }),
      tx({ kind: 'expense', amount: pesos(1_350), category: 'Bills', note: 'Electricity bill', date: day(-3) }),
      tx({ kind: 'expense', amount: 185_50, category: 'Transport', note: 'Grab ride', date: day(-2) }),
      tx({ kind: 'goal', amount: pesos(2_000), category: 'Laptop Fund', goalId: laptop, date: day(-1) }),
      tx({ kind: 'expense', amount: pesos(350), category: 'Food', note: 'GrabFood', date: today }),
    ]);

    await db.settings.put({ key: 'displayName', value: 'Kurt' });
  });
}
