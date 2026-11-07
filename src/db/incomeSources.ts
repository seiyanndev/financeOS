import { db } from './db';
import { ValidationError } from './transactions';
import type { IncomeSource } from './types';
import { isCentavos } from '../lib/money';

export type IncomeSourceInput = Omit<IncomeSource, 'id'>;

function validate(input: IncomeSourceInput): IncomeSourceInput {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Give this income a name.');
  if (name.length > 40) throw new ValidationError('Keep the name under 40 characters.');
  if (!isCentavos(input.amount) || input.amount <= 0) throw new ValidationError('Enter how much lands, in pesos.');
  if (!Number.isInteger(input.intervalDays) || input.intervalDays < 1 || input.intervalDays > 366) {
    throw new ValidationError('Pay cycle must be between 1 and 366 days.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.anchorDate)) throw new ValidationError('Pick the next payday.');

  let foreign: IncomeSource['foreign'];
  if (input.foreign) {
    const currency = input.foreign.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('Use a 3-letter currency code, like AUD.');
    if (currency === 'PHP') throw new ValidationError('Leave the other currency off for peso income.');
    if (!Number.isSafeInteger(input.foreign.amount) || input.foreign.amount <= 0) {
      throw new ValidationError(`Enter the amount in ${currency}.`);
    }
    foreign = { currency, amount: input.foreign.amount };
  }

  return {
    name,
    amount: input.amount,
    intervalDays: input.intervalDays,
    anchorDate: input.anchorDate,
    kind: input.kind.trim() || 'salary',
    ...(foreign ? { foreign } : {}),
  };
}

export async function addIncomeSource(input: IncomeSourceInput): Promise<number> {
  const s = validate(input);
  return (await db.incomeSources.add(s)) as number;
}

export async function updateIncomeSource(id: number, input: IncomeSourceInput): Promise<void> {
  const s = validate(input);
  await db.transaction('rw', db.incomeSources, async () => {
    if (!(await db.incomeSources.get(id))) throw new ValidationError('That income source no longer exists.');
    await db.incomeSources.put({ ...s, id }); // put() so a removed foreign amount is really removed
  });
}

/** Past income from this source stays in history under its name. */
export async function deleteIncomeSource(id: number): Promise<void> {
  await db.incomeSources.delete(id);
}
