import Dexie, { type EntityTable } from 'dexie';
import { assertCentavos } from '../lib/money';
import type { Goal, IncomeSource, Setting, Transaction } from './types';

export class FinanceDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  incomeSources!: EntityTable<IncomeSource, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'finance-os') {
    super(name);
    this.version(1).stores({
      transactions: '++id, date, kind, goalId, sourceId, [kind+date]',
      goals: '++id, order',
      incomeSources: '++id',
      settings: 'key',
    });

    // Guard the centavos rule at the storage boundary, so a float can never be persisted.
    const guard = (table: string, fields: string[]) => {
      const check = (obj: Record<string, unknown>) => {
        for (const f of fields) {
          if (!(f in obj)) continue;
          assertCentavos(obj[f], `${table}.${f}`);
          // Direction lives in `kind`, so stored amounts are never negative.
          if ((obj[f] as number) < 0) throw new RangeError(`${table}.${f} must not be negative`);
        }
      };
      this.table(table).hook('creating', (_key, obj) => check(obj));
      this.table(table).hook('updating', (mods) => check(mods as Record<string, unknown>));
    };
    guard('transactions', ['amount']);
    guard('goals', ['target']);
    guard('incomeSources', ['amount']);
  }
}

export const db = new FinanceDB();
