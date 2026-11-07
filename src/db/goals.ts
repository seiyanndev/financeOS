import { db } from './db';
import { ValidationError } from './transactions';
import { isCentavos, type Centavos } from '../lib/money';
import type { ISODate } from '../lib/dates';

export interface GoalInput {
  name: string;
  target: Centavos;
  /** Omit or pass undefined for no target date. */
  targetDate?: ISODate;
}

function validate(input: GoalInput): GoalInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Give the goal a name.');
  if (name.length > 40) throw new ValidationError('Keep the name under 40 characters.');
  if (!isCentavos(input.target) || input.target <= 0) throw new ValidationError('Enter a target greater than ₱0.');
  if (input.targetDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
    throw new ValidationError('Pick a valid target date.');
  }
  return { name, target: input.target, targetDate: input.targetDate };
}

async function assertUniqueName(name: string, exceptId?: number) {
  const clash = await db.goals.filter((g) => g.id !== exceptId && g.name.toLowerCase() === name.toLowerCase()).first();
  if (clash) throw new ValidationError(`You already have a goal called “${clash.name}”.`);
}

/** Creates a goal at the end of the list. Returns its id. */
export async function addGoal(input: GoalInput): Promise<number> {
  const g = validate(input);
  return db.transaction('rw', db.goals, async () => {
    await assertUniqueName(g.name);
    const last = await db.goals.orderBy('order').last();
    const id = await db.goals.add({
      name: g.name,
      target: g.target,
      ...(g.targetDate ? { targetDate: g.targetDate } : {}),
      order: (last?.order ?? -1) + 1,
      createdAt: Date.now(),
    });
    return id as number;
  });
}

export async function updateGoal(id: number, input: GoalInput): Promise<void> {
  const g = validate(input);
  await db.transaction('rw', db.goals, db.transactions, async () => {
    const existing = await db.goals.get(id);
    if (!existing) throw new ValidationError('That goal no longer exists.');
    await assertUniqueName(g.name, id);
    // Dexie's update() ignores undefined, so clear the date explicitly via put().
    await db.goals.put({ ...existing, name: g.name, target: g.target, targetDate: g.targetDate });
    // Keep the label on past transfers in step with the goal's name.
    if (existing.name !== g.name) {
      await db.transactions.where('goalId').equals(id).modify({ category: g.name });
    }
  });
}

/**
 * Deletes the goal. Past transfers stay in history (they still happened and still count
 * as "saved" for their month); they keep the goal's name as their label.
 */
export async function deleteGoal(id: number): Promise<void> {
  await db.goals.delete(id);
}
