import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addGoal, deleteGoal, updateGoal } from './goals';
import { addTransaction } from './transactions';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('goals', () => {
  it('adds goals in order with trimmed names', async () => {
    const a = await addGoal({ name: ' Laptop Fund ', target: 6_000_000 });
    const b = await addGoal({ name: 'Japan Trip', target: 15_000_000, targetDate: '2027-04-01' });
    const goals = await db.goals.orderBy('order').toArray();
    expect(goals.map((g) => [g.id, g.name, g.order])).toEqual([[a, 'Laptop Fund', 0], [b, 'Japan Trip', 1]]);
    expect(goals[0]!.targetDate).toBeUndefined();
    expect(goals[1]!.targetDate).toBe('2027-04-01');
  });

  it('validates input', async () => {
    await expect(addGoal({ name: '  ', target: 100 })).rejects.toThrow(/name/);
    await expect(addGoal({ name: 'x', target: 0 })).rejects.toThrow(/target/);
    await expect(addGoal({ name: 'x', target: 99.5 })).rejects.toThrow(/target/);
    await expect(addGoal({ name: 'x', target: 100, targetDate: 'soon' })).rejects.toThrow(/date/);
  });

  it('rejects duplicate names, ignoring case', async () => {
    const id = await addGoal({ name: 'Laptop', target: 100 });
    await expect(addGoal({ name: 'laptop', target: 100 })).rejects.toThrow(/already/);
    await expect(updateGoal(id, { name: 'LAPTOP', target: 200 })).resolves.toBeUndefined(); // renaming itself is fine
  });

  it('updates fields, clears the date, and relabels past transfers', async () => {
    const id = await addGoal({ name: 'Laptop', target: 100_000, targetDate: '2027-01-01' });
    await addTransaction({ kind: 'goal', amount: 5_000, category: 'Laptop', date: '2026-09-01', goalId: id });
    await updateGoal(id, { name: 'New Laptop', target: 200_000 });
    const g = await db.goals.get(id);
    expect(g).toMatchObject({ name: 'New Laptop', target: 200_000 });
    expect(g?.targetDate).toBeUndefined();
    expect((await db.transactions.where('goalId').equals(id).first())?.category).toBe('New Laptop');
  });

  it('deletes the goal but keeps its history', async () => {
    const id = await addGoal({ name: 'Laptop', target: 100_000 });
    await addTransaction({ kind: 'goal', amount: 5_000, category: 'Laptop', date: '2026-09-01', goalId: id });
    await deleteGoal(id);
    expect(await db.goals.get(id)).toBeUndefined();
    expect(await db.transactions.count()).toBe(1);
  });
});
