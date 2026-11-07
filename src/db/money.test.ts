import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addIncomeSource, deleteIncomeSource, updateIncomeSource } from './incomeSources';
import { recordPaycheck, TEMPLATE_KEY } from './paycheck';
import { addGoal } from './goals';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const main = { name: 'Main Job', amount: 1_300_000, intervalDays: 14, anchorDate: '2026-10-01', kind: 'salary' };

describe('income sources', () => {
  it('normalises and stores a foreign salary', async () => {
    const id = await addIncomeSource({ ...main, name: ' Main Job ', foreign: { currency: 'aud', amount: 30_000 } });
    expect(await db.incomeSources.get(id)).toMatchObject({ name: 'Main Job', foreign: { currency: 'AUD', amount: 30_000 } });
  });

  it('validates', async () => {
    await expect(addIncomeSource({ ...main, name: '' })).rejects.toThrow(/name/);
    await expect(addIncomeSource({ ...main, amount: 0 })).rejects.toThrow(/pesos/);
    await expect(addIncomeSource({ ...main, amount: 12.5 })).rejects.toThrow(/pesos/);
    await expect(addIncomeSource({ ...main, intervalDays: 0 })).rejects.toThrow(/cycle/);
    await expect(addIncomeSource({ ...main, foreign: { currency: 'AU', amount: 1 } })).rejects.toThrow(/3-letter/);
    await expect(addIncomeSource({ ...main, foreign: { currency: 'PHP', amount: 1 } })).rejects.toThrow(/peso/);
  });

  it('removes the foreign amount on update and deletes cleanly', async () => {
    const id = await addIncomeSource({ ...main, foreign: { currency: 'AUD', amount: 30_000 } });
    await updateIncomeSource(id, { ...main, intervalDays: 15 });
    const s = await db.incomeSources.get(id);
    expect(s?.foreign).toBeUndefined();
    expect(s?.intervalDays).toBe(15);
    await deleteIncomeSource(id);
    expect(await db.incomeSources.count()).toBe(0);
  });
});

describe('recordPaycheck', () => {
  it('records income, goal transfers and set-aside together, and remembers the template', async () => {
    const sourceId = await addIncomeSource(main);
    const laptop = await addGoal({ name: 'Laptop', target: 6_000_000 });
    const trip = await addGoal({ name: 'Trip', target: 6_000_000 });
    await recordPaycheck({
      sourceId,
      label: 'Main Job',
      amount: 1_300_000,
      date: '2026-10-01',
      goals: [{ goalId: laptop, amount: 260_000 }, { goalId: trip, amount: 0 }],
      setAside: 130_000,
      template: { [`goal-${laptop}`]: 20, aside: 10 },
    });
    const txs = await db.transactions.orderBy('id').toArray();
    expect(txs.map((t) => [t.kind, t.amount, t.category])).toEqual([
      ['income', 1_300_000, 'Main Job'],
      ['goal', 260_000, 'Laptop'],
      ['allocation', 130_000, 'Set aside'],
    ]);
    expect(txs[0]!.sourceId).toBe(sourceId);
    expect(JSON.parse((await db.settings.get(TEMPLATE_KEY))!.value)).toEqual({ [`goal-${laptop}`]: 20, aside: 10 });
  });

  it('refuses a split larger than the paycheck', async () => {
    await expect(
      recordPaycheck({ label: 'Other', amount: 10_000, date: '2026-10-01', goals: [], setAside: 10_001, template: {} }),
    ).rejects.toThrow(/more than/);
  });

  it('writes nothing if a goal is missing', async () => {
    await expect(
      recordPaycheck({
        label: 'Other', amount: 10_000, date: '2026-10-01',
        goals: [{ goalId: 404, amount: 1_000 }], setAside: 0, template: {},
      }),
    ).rejects.toThrow(/goal/);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.settings.get(TEMPLATE_KEY)).toBeUndefined();
  });
});
