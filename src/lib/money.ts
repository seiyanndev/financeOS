/**
 * All money in Finance OS is stored and computed as integer centavos (₱1 = 100).
 * Never store floats. Convert to pesos only when formatting for display.
 */
export type Centavos = number;

export function isCentavos(value: unknown): value is Centavos {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertCentavos(value: unknown, field = 'amount'): asserts value is Centavos {
  if (!isCentavos(value)) {
    throw new TypeError(`${field} must be an integer number of centavos, got ${String(value)}`);
  }
}

/** Whole pesos → centavos. For literals and seed data; user input goes through parsePeso. */
export function pesos(whole: number): Centavos {
  if (!Number.isSafeInteger(whole)) throw new TypeError(`pesos() takes whole pesos, got ${whole}`);
  return whole * 100;
}

const MINUS = '−'; // typographic minus, as in the designs
const groupFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export interface FormatOptions {
  /** 'negative' (default): only negatives get a sign. 'always': +₱ / −₱. 'never': absolute value. */
  sign?: 'negative' | 'always' | 'never';
  /** 'auto' (default): hide .00 when the amount is whole pesos. 'always': always two decimals. */
  cents?: 'auto' | 'always';
}

/** 123450 → "₱1,234.50"; 1248000 → "₱12,480". Integer maths only, no float rounding. */
export function formatPeso(amount: Centavos, opts: FormatOptions = {}): string {
  assertCentavos(amount);
  const { sign = 'negative', cents = 'auto' } = opts;
  const abs = Math.abs(amount);
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  let body = '₱' + groupFmt.format(whole);
  if (cents === 'always' || frac !== 0) body += '.' + String(frac).padStart(2, '0');

  if (sign === 'never' || amount === 0) return body;
  if (amount < 0) return MINUS + body;
  return sign === 'always' ? '+' + body : body;
}

/**
 * Parses what a person types into an amount field: "350", "1,250.5", "₱ 99.99".
 * Returns null for anything that isn't a non-negative amount with at most 2 decimals.
 * String-based so "0.1 + 0.2" style float errors can't creep in.
 */
export function parsePeso(input: string): Centavos | null {
  const cleaned = input.replace(/[₱,\s]/g, '');
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || cleaned === '' || cleaned === '.') return null;
  const whole = match[1] ? Number(match[1]) : 0;
  const frac = Number((match[2] ?? '').padEnd(2, '0'));
  const result = whole * 100 + frac;
  return Number.isSafeInteger(result) ? result : null;
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Live formatting for an amount field as the person types: "4000" → "4,000", "12." stays "12.".
 * Returns null when the keystroke should be rejected (letters, a third decimal, too many digits).
 */
export function formatAmountInput(raw: string): string | null {
  const cleaned = raw.replace(/[₱,\s]/g, '');
  const m = /^(\d{0,12})(\.\d{0,2})?$/.exec(cleaned);
  if (!m) return null;
  const whole = m[1]!.replace(/^0+(?=\d)/, ''); // "007" → "7"
  return group(whole) + (m[2] ?? '');
}

/** Centavos → editable field text: 6000000 → "60,000", 123450 → "1,234.50". */
export function centavosToInput(amount: Centavos): string {
  assertCentavos(amount);
  const abs = Math.abs(amount);
  const frac = abs % 100;
  return group(String(Math.trunc(abs / 100))) + (frac ? '.' + String(frac).padStart(2, '0') : '');
}

/** Share of `part` in `whole` as a 0–100 number, safe for whole = 0. */
export function percentOf(part: Centavos, whole: Centavos): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}
