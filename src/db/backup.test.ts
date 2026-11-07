import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { deleteAllData, parseBackup, readAllData, restoreBackup, setDisplayName } from './backup';
import { makeBackup } from '../lib/export';
import { addGoal } from './goals';
import { addTransaction } from './transactions';
import { addIncomeSource } from './incomeSources';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function seed() {
  const goalId = await addGoal({ name: 'Laptop', target: 6_000_000, targetDate: '2027-06-01' });
  const sourceId = await addIncomeSource({
    name: 'Main Job', amount: 1_300_000, intervalDays: 14, anchorDate: '2026-11-12', kind: 'salary',
    foreign: { currency: 'AUD', amount: 30_000 },
  });
  await addTransaction({ kind: 'income', amount: 1_300_000, category: 'Main Job', date: '2026-11-01', sourceId });
  await addTransaction({ kind: 'goal', amount: 200_000, category: 'Laptop', date: '2026-11-02', goalId });
  await addTransaction({ kind: 'expense', amount: 35_050, category: 'Food', note: 'GrabFood', date: '2026-11-03' });
  await setDisplayName('Kurt');
}

describe('backup round trip', () => {
  it('restores exactly what was exported, ids included', async () => {
    await seed();
    const before = await readAllData();
    const text = JSON.stringify(makeBackup(before));
    await deleteAllData();
    expect(await db.transactions.count()).toBe(0);

    const { data, exportedAt } = parseBackup(text);
    expect(exportedAt).not.toBeNull();
    await restoreBackup(data);
    expect(await readAllData()).toEqual(before);
  });

  it('replaces existing data rather than merging', async () => {
    await seed();
    const text = JSON.stringify(makeBackup({ transactions: [], goals: [], incomeSources: [], settings: [{ key: 'displayName', value: 'Ana' }] }));
    await restoreBackup(parseBackup(text).data);
    expect(await db.transactions.count()).toBe(0);
    expect((await db.settings.get('displayName'))?.value).toBe('Ana');
  });
});

describe('parseBackup rejects bad files without touching data', () => {
  const good = () => makeBackup({
    transactions: [{ id: 1, kind: 'expense', amount: 100, category: 'Food', note: '', date: '2026-11-03', createdAt: 1 }],
    goals: [], incomeSources: [], settings: [],
  });

  it.each([
    ['not JSON', 'hello', /valid JSON/],
    ['another app', JSON.stringify({ app: 'other', version: 1, data: {} }), /isn’t a Finance OS backup/],
    ['newer version', JSON.stringify({ ...good(), version: 2 }), /newer version/],
  ])('%s', (_, text, msg) => {
    expect(() => parseBackup(text)).toThrow(msg);
  });

  it.each([
    ['float amount', { amount: 100.5 }],
    ['negative amount', { amount: -100 }],
    ['unknown kind', { kind: 'refund' }],
    ['bad date', { date: '03/11/2026' }],
    ['missing id', { id: undefined }],
  ])('rejects a transaction with %s', (_, patch) => {
    const b = good();
    b.data.transactions[0] = { ...b.data.transactions[0]!, ...patch } as never;
    expect(() => parseBackup(JSON.stringify(b))).toThrow(/damaged transaction \(#1\)/);
  });

  it('drops unknown fields', () => {
    const b = good() as unknown as { data: { transactions: Record<string, unknown>[] } };
    b.data.transactions[0]!.evil = '<script>';
    const { data } = parseBackup(JSON.stringify(b));
    expect(data.transactions[0]).not.toHaveProperty('evil');
  });
});

describe('setDisplayName', () => {
  it('trims, and removes when blank', async () => {
    await setDisplayName('  Kurt  ');
    expect((await db.settings.get('displayName'))?.value).toBe('Kurt');
    await setDisplayName('   ');
    expect(await db.settings.get('displayName')).toBeUndefined();
  });
});
