import type { Goal, IncomeSource, Setting, Transaction } from '../db/types';
import type { Centavos } from './money';

/** Centavos → plain decimal for spreadsheets: 35050 → "350.50", -100 → "-1.00". No float maths. */
export function centavosToDecimal(amount: Centavos): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * One CSV cell. Quotes when needed, and defuses text that a spreadsheet would run as a
 * formula (leading = + - @ tab or CR), since notes are free text.
 */
export function csvCell(value: string | number): string {
  let s = String(value);
  const isNumber = /^-?\d+(\.\d+)?$/.test(s); // our own amounts, e.g. "-350.00"
  if (!isNumber && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const KIND_LABEL: Record<Transaction['kind'], string> = {
  expense: 'Expense',
  income: 'Income',
  goal: 'To goal',
  allocation: 'Set aside',
};

export function transactionsToCSV(
  txs: readonly Transaction[],
  goals: readonly Goal[],
  sources: readonly IncomeSource[],
): string {
  const goalName = new Map(goals.map((g) => [g.id, g.name]));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const header = ['Date', 'Type', 'Category', 'Note', 'Amount (PHP)', 'Signed amount (PHP)', 'Goal', 'Income source'];
  const rows = [...txs]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map((t) => {
      const signed = t.kind === 'income' ? t.amount : -t.amount;
      return [
        t.date,
        KIND_LABEL[t.kind],
        t.category,
        t.note,
        centavosToDecimal(t.amount),
        centavosToDecimal(signed),
        t.goalId != null ? goalName.get(t.goalId) ?? '(deleted goal)' : '',
        t.sourceId != null ? sourceName.get(t.sourceId) ?? '(deleted source)' : '',
      ];
    });
  // BOM so Excel opens ₱ and accented names correctly; CRLF per RFC 4180.
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export interface Backup {
  app: 'finance-os';
  version: 1;
  exportedAt: string;
  /** All amounts are integer centavos. */
  data: { transactions: Transaction[]; goals: Goal[]; incomeSources: IncomeSource[]; settings: Setting[] };
}

export function makeBackup(data: Backup['data'], now = new Date()): Backup {
  return { app: 'finance-os', version: 1, exportedAt: now.toISOString(), data };
}

/** Saves text as a file via a temporary link. */
export function downloadFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
