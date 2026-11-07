import type { Centavos } from '../../lib/money';

export interface SplitRow {
  key: string;
  /** Whole percent, 0–100. */
  pct: number;
}

export interface SplitResult {
  amounts: Record<string, Centavos>;
  totalPct: number;
  allocated: Centavos;
  /** What stays for everyday spending. Absorbs rounding, so nothing is lost. Negative = over 100%. */
  left: Centavos;
}

/**
 * Splits a paycheck by whole percentages using integer centavos only. Each share is rounded
 * *down* to the centavo, and the leftover centavos stay in "left to spend", so the shares plus
 * `left` always add up to exactly `amount`.
 */
export function splitPaycheck(amount: Centavos, rows: readonly SplitRow[]): SplitResult {
  const amounts: Record<string, Centavos> = {};
  let allocated = 0;
  let totalPct = 0;
  for (const row of rows) {
    const pct = clampPct(row.pct);
    totalPct += pct;
    const share = Math.floor((amount * pct) / 100);
    amounts[row.key] = share;
    allocated += share;
  }
  return { amounts, totalPct, allocated, left: amount - allocated };
}

export function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Remembered split, stored in settings as JSON. Keys: 'aside' or `goal-<id>`. */
export type SplitTemplate = Record<string, number>;

export const DEFAULT_TEMPLATE: SplitTemplate = { aside: 10 };

export function parseTemplate(json: string | undefined): SplitTemplate {
  if (!json) return { ...DEFAULT_TEMPLATE };
  try {
    const raw: unknown = JSON.parse(json);
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_TEMPLATE };
    const out: SplitTemplate = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number') out[k] = clampPct(v);
    return out;
  } catch {
    return { ...DEFAULT_TEMPLATE };
  }
}
