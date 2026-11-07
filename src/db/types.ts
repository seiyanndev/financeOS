import type { Centavos } from '../lib/money';
import type { ISODate } from '../lib/dates';

/**
 * expense    – money out (Food, Bills…)
 * income     – money in (salary, freelance…)
 * goal       – moved into a savings goal ("saved")
 * allocation – set aside for a planned purpose from a paycheck split ("set aside")
 */
export type TransactionKind = 'expense' | 'income' | 'goal' | 'allocation';

export interface Transaction {
  id?: number;
  kind: TransactionKind;
  /** Always a positive integer of centavos; `kind` carries the direction. */
  amount: Centavos;
  category: string;
  note: string;
  date: ISODate;
  goalId?: number;
  sourceId?: number;
  createdAt: number;
}

export interface Goal {
  id?: number;
  name: string;
  target: Centavos;
  targetDate?: ISODate;
  order: number;
  createdAt: number;
}

export interface IncomeSource {
  id?: number;
  name: string;
  /** Expected amount per payday, in PHP centavos. */
  amount: Centavos;
  /** Original-currency amount for foreign salaries, in that currency's minor units. */
  foreign?: { currency: string; amount: number };
  intervalDays: number;
  /** Any known payday; later paydays are anchor + n × intervalDays. */
  anchorDate: ISODate;
  kind: string; // "salary", "freelance"…
}

export interface Setting {
  key: string;
  value: string;
}
