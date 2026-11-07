import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { FinanceDB } from './db';

const base = { kind: 'expense' as const, category: 'Food', note: '', date: '2026-09-23', createdAt: 0 };
let db: FinanceDB;

afterEach(async () => {
  await db?.delete();
});

describe('centavos guard', () => {
  it('stores integer centavos', async () => {
    db = new FinanceDB('t1');
    const id = await db.transactions.add({ ...base, amount: 35_050 });
    expect((await db.transactions.get(id))?.amount).toBe(35_050);
  });

  it('refuses floats and negatives on create', async () => {
    db = new FinanceDB('t2');
    await expect(db.transactions.add({ ...base, amount: 350.5 })).rejects.toThrow(/centavos/);
    await expect(db.transactions.add({ ...base, amount: -100 })).rejects.toThrow(/negative/);
    await expect(db.goals.add({ name: 'x', target: 0.1, order: 0, createdAt: 0 })).rejects.toThrow();
  });

  it('refuses floats on update', async () => {
    db = new FinanceDB('t3');
    const id = await db.transactions.add({ ...base, amount: 100 });
    await expect(db.transactions.update(id, { amount: 1.25 })).rejects.toThrow(/centavos/);
  });
});
