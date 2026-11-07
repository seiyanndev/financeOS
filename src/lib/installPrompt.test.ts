import { describe, expect, it } from 'vitest';
import { MAX_DISMISSALS, NEW_VISIT_GAP_MS, recordDismissal, recordVisit, shouldOffer, SNOOZE_MS, type PromptRecord } from './installPrompt';

const empty: PromptRecord = { visits: 0, lastVisit: 0, dismissals: 0, snoozeUntil: 0 };
const T0 = 1_800_000_000_000;

describe('install prompt timing', () => {
  it('never offers on the first visit', () => {
    const r = recordVisit(empty, T0);
    expect(r.visits).toBe(1);
    expect(shouldOffer(r, T0)).toBe(false);
  });

  it('treats quick reloads as the same visit', () => {
    let r = recordVisit(empty, T0);
    r = recordVisit(r, T0 + 5 * 60_000);
    r = recordVisit(r, T0 + 20 * 60_000);
    expect(r.visits).toBe(1);
    expect(shouldOffer(r, T0 + 20 * 60_000)).toBe(false);
  });

  it('offers from the second real visit', () => {
    let r = recordVisit(empty, T0);
    r = recordVisit(r, T0 + NEW_VISIT_GAP_MS);
    expect(r.visits).toBe(2);
    expect(shouldOffer(r, T0 + NEW_VISIT_GAP_MS)).toBe(true);
  });

  it('snoozes for 14 days after "Not now", and stops after two', () => {
    let r: PromptRecord = { ...empty, visits: 3 };
    r = recordDismissal(r, T0);
    expect(shouldOffer(r, T0 + SNOOZE_MS - 1)).toBe(false);
    expect(shouldOffer(r, T0 + SNOOZE_MS)).toBe(true);
    r = recordDismissal(r, T0 + SNOOZE_MS);
    expect(r.dismissals).toBe(MAX_DISMISSALS);
    expect(shouldOffer(r, T0 + 10 * SNOOZE_MS)).toBe(false);
  });
});
