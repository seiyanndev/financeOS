import { describe, expect, it } from 'vitest';
import { centavosToInput, formatAmountInput, formatPeso, parsePeso, pesos } from './money';

describe('formatAmountInput', () => {
  it.each([
    ['4000', '4,000'],
    ['1234567.8', '1,234,567.8'],
    ['12.', '12.'],
    ['007', '7'],
    ['0.5', '0.5'],
    ['', ''],
    ['4,0000', '40,000'], // commas are re-placed, not trusted
  ])('%j → %j', (raw, expected) => expect(formatAmountInput(raw)).toBe(expected));

  it.each(['1.234', 'abc', '1-2', '1234567890123'])('rejects %j', (raw) => {
    expect(formatAmountInput(raw)).toBeNull();
  });

  it('round-trips with parsePeso', () => {
    expect(parsePeso(formatAmountInput('1234.56')!)).toBe(123_456);
  });
});

describe('centavosToInput', () => {
  it('produces editable text', () => {
    expect(centavosToInput(6_000_000)).toBe('60,000');
    expect(centavosToInput(123_450)).toBe('1,234.50');
    expect(parsePeso(centavosToInput(123_405))).toBe(123_405);
  });
});

describe('formatPeso', () => {
  it('formats whole pesos without decimals', () => {
    expect(formatPeso(1_248_000)).toBe('₱12,480');
    expect(formatPeso(0)).toBe('₱0');
  });
  it('shows centavos when present', () => {
    expect(formatPeso(123_450)).toBe('₱1,234.50');
    expect(formatPeso(5)).toBe('₱0.05');
    expect(formatPeso(100, { cents: 'always' })).toBe('₱1.00');
  });
  it('handles signs', () => {
    expect(formatPeso(-35_000)).toBe('−₱350');
    expect(formatPeso(400_000, { sign: 'always' })).toBe('+₱4,000');
    expect(formatPeso(-35_000, { sign: 'never' })).toBe('₱350');
  });
  it('rejects non-integers', () => {
    expect(() => formatPeso(10.5)).toThrow(TypeError);
  });
});

describe('parsePeso', () => {
  it.each([
    ['350', 35_000],
    ['1,250.5', 125_050],
    ['₱ 99.99', 9_999],
    ['.5', 50],
    ['0.10', 10],
    ['12.', 1_200],
  ])('%s → %i', (input, expected) => expect(parsePeso(input)).toBe(expected));

  it.each(['', '.', 'abc', '1.234', '-5', '1e3'])('rejects %j', (input) => {
    expect(parsePeso(input)).toBeNull();
  });

  it('avoids float drift (0.1 + 0.2)', () => {
    expect(parsePeso('0.1')! + parsePeso('0.2')!).toBe(parsePeso('0.3'));
  });
});

describe('pesos', () => {
  it('converts whole pesos', () => expect(pesos(13_000)).toBe(1_300_000));
  it('rejects fractions', () => expect(() => pesos(1.5)).toThrow());
});
