import { describe, expect, it } from 'vitest';
import { clampPct, parseTemplate, splitPaycheck } from './split';

describe('splitPaycheck', () => {
  it('splits by whole percent', () => {
    const r = splitPaycheck(1_300_000, [
      { key: 'goal-1', pct: 20 },
      { key: 'aside', pct: 10 },
    ]);
    expect(r.amounts).toEqual({ 'goal-1': 260_000, aside: 130_000 });
    expect(r).toMatchObject({ totalPct: 30, allocated: 390_000, left: 910_000 });
  });

  it('never loses or invents a centavo', () => {
    // ₱100.01 three ways at 33% each: shares round down, the rest stays to spend.
    const r = splitPaycheck(10_001, [
      { key: 'a', pct: 33 },
      { key: 'b', pct: 33 },
      { key: 'c', pct: 33 },
    ]);
    expect(Object.values(r.amounts)).toEqual([3_300, 3_300, 3_300]);
    expect(r.allocated + r.left).toBe(10_001);
    expect(Object.values(r.amounts).every(Number.isInteger)).toBe(true);
  });

  it('reports going over 100%', () => {
    const r = splitPaycheck(10_000, [
      { key: 'a', pct: 70 },
      { key: 'b', pct: 40 },
    ]);
    expect(r.totalPct).toBe(110);
    expect(r.left).toBe(-1_000);
  });

  it('handles a zero amount', () => {
    expect(splitPaycheck(0, [{ key: 'a', pct: 50 }])).toMatchObject({ allocated: 0, left: 0 });
  });
});

describe('clampPct / parseTemplate', () => {
  it('clamps', () => {
    expect([clampPct(-5), clampPct(150), clampPct(12.6), clampPct(NaN)]).toEqual([0, 100, 13, 0]);
  });
  it('parses stored templates defensively', () => {
    expect(parseTemplate(undefined)).toEqual({ aside: 10 });
    expect(parseTemplate('not json')).toEqual({ aside: 10 });
    expect(parseTemplate('{"aside":15,"goal-2":200,"x":"y"}')).toEqual({ aside: 15, 'goal-2': 100 });
  });
});
