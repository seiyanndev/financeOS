import { db } from './db';
import { ValidationError } from './transactions';
import type { Transaction } from './types';
import { isCentavos, type Centavos } from '../lib/money';
import type { ISODate } from '../lib/dates';
import type { SplitTemplate } from '../features/money/split';

export interface PaycheckInput {
  /** Omit for one-off income not tied to a source. */
  sourceId?: number;
  /** Label for the income (the source's name, or "Other"). */
  label: string;
  amount: Centavos;
  date: ISODate;
  goals: { goalId: number; amount: Centavos }[];
  setAside: Centavos;
  /** Saved as the default split for next time. */
  template: SplitTemplate;
}

export const TEMPLATE_KEY = 'splitTemplate';

/**
 * Records a paycheck and its split in one go: the income, one transfer per goal, and one
 * "set aside" entry. All or nothing, so a failure can't leave half a split behind.
 */
export async function recordPaycheck(input: PaycheckInput): Promise<void> {
  const label = input.label.trim();
  if (!label) throw new ValidationError('Pick where this paycheck came from.');
  if (!isCentavos(input.amount) || input.amount <= 0) throw new ValidationError('Enter the amount you received.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ValidationError('Pick a valid date.');
  const parts = [...input.goals.map((g) => g.amount), input.setAside];
  if (parts.some((a) => !isCentavos(a) || a < 0)) throw new ValidationError('Split amounts must be whole centavos.');
  const allocated = parts.reduce((s, a) => s + a, 0);
  if (allocated > input.amount) throw new ValidationError('The split adds up to more than the paycheck.');

  await db.transaction('rw', [db.transactions, db.goals, db.incomeSources, db.settings], async () => {
    if (input.sourceId != null && !(await db.incomeSources.get(input.sourceId))) {
      throw new ValidationError('That income source no longer exists.');
    }
    const goals = await db.goals.bulkGet(input.goals.map((g) => g.goalId));

    let createdAt = Date.now();
    const rows: Transaction[] = [
      {
        kind: 'income',
        amount: input.amount,
        category: label,
        note: '',
        date: input.date,
        ...(input.sourceId != null ? { sourceId: input.sourceId } : {}),
        createdAt: createdAt++,
      },
    ];
    input.goals.forEach((g, i) => {
      if (g.amount === 0) return;
      const goal = goals[i];
      if (!goal) throw new ValidationError('One of those goals no longer exists.');
      rows.push({
        kind: 'goal',
        amount: g.amount,
        category: goal.name,
        note: `From ${label} paycheck`,
        date: input.date,
        goalId: g.goalId,
        createdAt: createdAt++,
      });
    });
    if (input.setAside > 0) {
      rows.push({
        kind: 'allocation',
        amount: input.setAside,
        category: 'Set aside',
        note: `From ${label} paycheck`,
        date: input.date,
        createdAt: createdAt++,
      });
    }
    await db.transactions.bulkAdd(rows);
    await db.settings.put({ key: TEMPLATE_KEY, value: JSON.stringify(input.template) });
  });
}
