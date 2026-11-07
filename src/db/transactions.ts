import { db } from './db';
import type { Transaction, TransactionKind } from './types';
import { isCentavos, type Centavos } from '../lib/money';
import type { ISODate } from '../lib/dates';

export interface NewTransaction {
  kind: TransactionKind;
  amount: Centavos;
  category: string;
  note?: string;
  date: ISODate;
  goalId?: number;
  sourceId?: number;
}

export class ValidationError extends Error {}

export interface TransactionPatch {
  amount: Centavos;
  category: string;
  note: string;
  date: ISODate;
  /** Only for goal transfers: move it to a different goal. */
  goalId?: number;
  /** Only for income: link to a source, or null to unlink ("Other"). */
  sourceId?: number | null;
}

/** Edits a transaction. Its kind can't change; delete and re-add for that. */
export async function updateTransaction(id: number, patch: TransactionPatch): Promise<void> {
  if (!isCentavos(patch.amount) || patch.amount <= 0) throw new ValidationError('Enter an amount greater than ₱0.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) throw new ValidationError('Pick a valid date.');
  const category = patch.category.trim();
  if (!category) throw new ValidationError('Pick a category.');

  await db.transaction('rw', [db.transactions, db.goals, db.incomeSources], async () => {
    const tx = await db.transactions.get(id);
    if (!tx) throw new ValidationError('That transaction no longer exists.');
    const next = { ...tx, amount: patch.amount, category, note: patch.note.trim(), date: patch.date };

    if (tx.kind === 'goal' && patch.goalId !== undefined) {
      if (!(await db.goals.get(patch.goalId))) throw new ValidationError('That goal no longer exists.');
      next.goalId = patch.goalId;
    }
    if (tx.kind === 'income' && patch.sourceId !== undefined) {
      if (patch.sourceId === null) delete next.sourceId;
      else if (!(await db.incomeSources.get(patch.sourceId))) throw new ValidationError('That income source no longer exists.');
      else next.sourceId = patch.sourceId;
    }
    await db.transactions.put(next);
  });
}

/** Deletes a transaction and returns it, so the caller can offer Undo. */
export async function deleteTransaction(id: number): Promise<Transaction | undefined> {
  return db.transaction('rw', db.transactions, async () => {
    const tx = await db.transactions.get(id);
    if (tx) await db.transactions.delete(id);
    return tx;
  });
}

/** Puts a deleted transaction back exactly as it was (same id). */
export async function restoreTransaction(tx: Transaction): Promise<void> {
  await db.transactions.put(tx);
}

/** Validates and stores one transaction. Returns its id. */
export async function addTransaction(input: NewTransaction): Promise<number> {
  if (!isCentavos(input.amount) || input.amount <= 0) {
    throw new ValidationError('Enter an amount greater than ₱0.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ValidationError('Pick a valid date.');
  const category = input.category.trim();
  if (!category) throw new ValidationError('Pick a category.');

  return db.transaction('rw', [db.transactions, db.goals, db.incomeSources], async () => {
    if (input.kind === 'goal') {
      if (input.goalId == null || !(await db.goals.get(input.goalId))) {
        throw new ValidationError('That goal no longer exists.');
      }
    }
    if (input.sourceId != null && !(await db.incomeSources.get(input.sourceId))) {
      throw new ValidationError('That income source no longer exists.');
    }
    const id = await db.transactions.add({
      kind: input.kind,
      amount: input.amount,
      category,
      note: (input.note ?? '').trim(),
      date: input.date,
      ...(input.kind === 'goal' ? { goalId: input.goalId } : {}),
      ...(input.sourceId != null ? { sourceId: input.sourceId } : {}),
      createdAt: Date.now(),
    });
    return id as number;
  });
}
