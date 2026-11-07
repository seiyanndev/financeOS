import { db } from './db';
import { ValidationError } from './transactions';
import type { Goal, IncomeSource, Setting, Transaction, TransactionKind } from './types';
import type { Backup } from '../lib/export';

const KINDS: readonly TransactionKind[] = ['expense', 'income', 'goal', 'allocation'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const posInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const str = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;
const optId = (v: unknown) => v === undefined || posInt(v);

/**
 * Checks a backup file record by record and returns clean copies containing only known fields.
 * Throws a ValidationError naming the first problem, so a bad file never touches the database.
 */
export function parseBackup(text: string): { data: Backup['data']; exportedAt: string | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ValidationError('That file isn’t a Finance OS backup (it isn’t valid JSON).');
  }
  if (!isObj(raw) || raw.app !== 'finance-os') throw new ValidationError('That file isn’t a Finance OS backup.');
  if (raw.version !== 1) throw new ValidationError('This backup is from a newer version of Finance OS.');
  const data = raw.data;
  if (!isObj(data)) throw new ValidationError('The backup is missing its data.');
  const list = (key: string): unknown[] => {
    const v = data[key];
    if (v === undefined) return [];
    if (!Array.isArray(v)) throw new ValidationError(`The backup’s ${key} section is damaged.`);
    return v;
  };
  const fail = (what: string, i: number): never => {
    throw new ValidationError(`The backup has a damaged ${what} (#${i + 1}). Nothing was changed.`);
  };

  const goals: Goal[] = list('goals').map((g, i) => {
    if (!isObj(g) || !posInt(g.id) || !str(g.name, 40) || !g.name.trim() || !posInt(g.target) ||
        (g.targetDate !== undefined && !(str(g.targetDate) && DATE.test(g.targetDate))) ||
        typeof g.order !== 'number' || typeof g.createdAt !== 'number') return fail('goal', i);
    return { id: g.id, name: g.name, target: g.target, ...(g.targetDate ? { targetDate: g.targetDate as string } : {}), order: g.order, createdAt: g.createdAt };
  });

  const incomeSources: IncomeSource[] = list('incomeSources').map((s, i) => {
    if (!isObj(s) || !posInt(s.id) || !str(s.name, 40) || !s.name.trim() || !posInt(s.amount) ||
        !posInt(s.intervalDays) || s.intervalDays > 366 || !(str(s.anchorDate) && DATE.test(s.anchorDate)) || !str(s.kind, 40)) {
      return fail('payday', i);
    }
    let foreign: IncomeSource['foreign'];
    if (s.foreign !== undefined) {
      const f = s.foreign;
      if (!isObj(f) || !(str(f.currency) && /^[A-Z]{3}$/.test(f.currency)) || !posInt(f.amount)) return fail('payday', i);
      foreign = { currency: f.currency, amount: f.amount };
    }
    return { id: s.id, name: s.name, amount: s.amount, intervalDays: s.intervalDays, anchorDate: s.anchorDate, kind: s.kind, ...(foreign ? { foreign } : {}) };
  });

  const transactions: Transaction[] = list('transactions').map((t, i) => {
    if (!isObj(t) || !posInt(t.id) || !KINDS.includes(t.kind as TransactionKind) || !posInt(t.amount) ||
        !str(t.category, 80) || !str(t.note, 200) || !(str(t.date) && DATE.test(t.date)) ||
        typeof t.createdAt !== 'number' || !optId(t.goalId) || !optId(t.sourceId)) return fail('transaction', i);
    return {
      id: t.id, kind: t.kind as TransactionKind, amount: t.amount, category: t.category, note: t.note, date: t.date, createdAt: t.createdAt,
      ...(t.goalId !== undefined ? { goalId: t.goalId as number } : {}),
      ...(t.sourceId !== undefined ? { sourceId: t.sourceId as number } : {}),
    };
  });

  const settings: Setting[] = list('settings').map((s, i) => {
    if (!isObj(s) || !str(s.key, 64) || !str(s.value, 10_000)) return fail('setting', i);
    return { key: s.key, value: s.value };
  });

  const exportedAt = typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt)) ? raw.exportedAt : null;
  return { data: { transactions, goals, incomeSources, settings }, exportedAt };
}

/** Replaces everything with the backup's contents, all or nothing. */
export async function restoreBackup(data: Backup['data']): Promise<void> {
  await db.transaction('rw', [db.transactions, db.goals, db.incomeSources, db.settings], async () => {
    await Promise.all([db.transactions.clear(), db.goals.clear(), db.incomeSources.clear(), db.settings.clear()]);
    await db.goals.bulkAdd(data.goals);
    await db.incomeSources.bulkAdd(data.incomeSources);
    await db.transactions.bulkAdd(data.transactions);
    await db.settings.bulkAdd(data.settings);
  });
}

export async function readAllData(): Promise<Backup['data']> {
  const [transactions, goals, incomeSources, settings] = await Promise.all([
    db.transactions.toArray(),
    db.goals.toArray(),
    db.incomeSources.toArray(),
    db.settings.toArray(),
  ]);
  return { transactions, goals, incomeSources, settings };
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', [db.transactions, db.goals, db.incomeSources, db.settings], async () => {
    await Promise.all([db.transactions.clear(), db.goals.clear(), db.incomeSources.clear(), db.settings.clear()]);
  });
}

export async function setDisplayName(name: string): Promise<void> {
  const value = name.trim().slice(0, 30);
  if (value) await db.settings.put({ key: 'displayName', value });
  else await db.settings.delete('displayName');
}
