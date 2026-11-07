import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction, ValidationError } from './transactions';

describe('updateTransaction / delete / restore', () => {
  it('edits fields but not the kind', async () => {
    const id = await addTransaction({ kind: 'expense', amount: 100, category: 'Food', date: '2026-09-23' });
    await updateTransaction(id, { amount: 25_050, category: 'Transport', note: ' Taxi ', date: '2026-09-22' });
    expect(await db.transactions.get(id)).toMatchObject({ kind: 'expense', amount: 25_050, category: 'Transport', note: 'Taxi', date: '2026-09-22' });
  });

  it('validates', async () => {
    const id = await addTransaction({ kind: 'expense', amount: 100, category: 'Food', date: '2026-09-23' });
    await expect(updateTransaction(id, { amount: 1.5, category: 'Food', note: '', date: '2026-09-23' })).rejects.toThrow(/amount/);
    await expect(updateTransaction(999, { amount: 100, category: 'Food', note: '', date: '2026-09-23' })).rejects.toThrow(/exists/);
  });

  it('moves a transfer to another goal and unlinks income', async () => {
    const a = (await db.goals.add({ name: 'A', target: 100, order: 0, createdAt: 0 })) as number;
    const b = (await db.goals.add({ name: 'B', target: 100, order: 1, createdAt: 0 })) as number;
    const g = await addTransaction({ kind: 'goal', amount: 50, category: 'A', date: '2026-09-23', goalId: a });
    await updateTransaction(g, { amount: 50, category: 'B', note: '', date: '2026-09-23', goalId: b });
    expect((await db.transactions.get(g))?.goalId).toBe(b);

    const src = (await db.incomeSources.add({ name: 'Job', amount: 100, intervalDays: 14, anchorDate: '2026-10-01', kind: 'salary' })) as number;
    const i = await addTransaction({ kind: 'income', amount: 100, category: 'Job', date: '2026-09-23', sourceId: src });
    await updateTransaction(i, { amount: 100, category: 'Other', note: '', date: '2026-09-23', sourceId: null });
    expect((await db.transactions.get(i))?.sourceId).toBeUndefined();
  });

  it('restores a deleted transaction with the same id', async () => {
    const id = await addTransaction({ kind: 'expense', amount: 100, category: 'Food', date: '2026-09-23' });
    const removed = await deleteTransaction(id);
    expect(await db.transactions.count()).toBe(0);
    await restoreTransaction(removed!);
    expect(await db.transactions.get(id)).toEqual(removed);
  });
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('addTransaction', () => {
  it('stores a trimmed expense', async () => {
    const id = await addTransaction({ kind: 'expense', amount: 35_000, category: ' Food ', note: ' GrabFood ', date: '2026-09-23' });
    const tx = await db.transactions.get(id);
    expect(tx).toMatchObject({ kind: 'expense', amount: 35_000, category: 'Food', note: 'GrabFood', date: '2026-09-23' });
    expect(tx?.goalId).toBeUndefined();
  });

  it.each([0, -100, 10.5])('rejects amount %s', async (amount) => {
    await expect(addTransaction({ kind: 'expense', amount, category: 'Food', date: '2026-09-23' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await db.transactions.count()).toBe(0);
  });

  it('rejects bad dates and empty categories', async () => {
    await expect(addTransaction({ kind: 'expense', amount: 100, category: 'Food', date: '23/09/2026' })).rejects.toThrow(/date/);
    await expect(addTransaction({ kind: 'expense', amount: 100, category: '  ', date: '2026-09-23' })).rejects.toThrow(/category/);
  });

  it('requires an existing goal for goal transfers', async () => {
    await expect(addTransaction({ kind: 'goal', amount: 100, category: 'Laptop', date: '2026-09-23', goalId: 99 })).rejects.toThrow(
      /goal/,
    );
    const goalId = (await db.goals.add({ name: 'Laptop', target: 6_000_000, order: 0, createdAt: 0 })) as number;
    const id = await addTransaction({ kind: 'goal', amount: 200_000, category: 'Laptop', date: '2026-09-23', goalId });
    expect((await db.transactions.get(id))?.goalId).toBe(goalId);
  });

  it('links income to its source', async () => {
    const sourceId = (await db.incomeSources.add({
      name: 'Main Job', amount: 1_300_000, intervalDays: 14, anchorDate: '2026-10-01', kind: 'salary',
    })) as number;
    const id = await addTransaction({ kind: 'income', amount: 1_200_000, category: 'Main Job', date: '2026-09-17', sourceId });
    expect((await db.transactions.get(id))?.sourceId).toBe(sourceId);
    await expect(
      addTransaction({ kind: 'income', amount: 100, category: 'Gone', date: '2026-09-17', sourceId: 404 }),
    ).rejects.toThrow(/source/);
  });
});
