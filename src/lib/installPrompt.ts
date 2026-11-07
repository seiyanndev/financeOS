/**
 * When to offer the install sheet (design note: "after the 2nd visit, never on first load").
 * Kept as plain functions over a small record so the rules are easy to test.
 */
export interface PromptRecord {
  visits: number;
  lastVisit: number; // ms
  dismissals: number;
  snoozeUntil: number; // ms
}

export const NEW_VISIT_GAP_MS = 30 * 60 * 1000; // reloads within 30 min are the same visit
export const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
export const MAX_DISMISSALS = 2;

const EMPTY: PromptRecord = { visits: 0, lastVisit: 0, dismissals: 0, snoozeUntil: 0 };

export function recordVisit(r: PromptRecord, now: number): PromptRecord {
  const isNew = now - r.lastVisit >= NEW_VISIT_GAP_MS;
  return { ...r, visits: isNew ? r.visits + 1 : r.visits, lastVisit: now };
}

export function recordDismissal(r: PromptRecord, now: number): PromptRecord {
  return { ...r, dismissals: r.dismissals + 1, snoozeUntil: now + SNOOZE_MS };
}

export function shouldOffer(r: PromptRecord, now: number): boolean {
  return r.visits >= 2 && r.dismissals < MAX_DISMISSALS && now >= r.snoozeUntil;
}

// --- localStorage wrapper (per-device; failures just mean "don't prompt") ---

const KEY = 'finance-os-install-prompt';

export function loadRecord(): PromptRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PromptRecord> | null;
    if (!raw || typeof raw !== 'object') return { ...EMPTY };
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return { visits: num(raw.visits), lastVisit: num(raw.lastVisit), dismissals: num(raw.dismissals), snoozeUntil: num(raw.snoozeUntil) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveRecord(r: PromptRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage blocked */
  }
}

/** Call once per app start. */
export function countVisit(now = Date.now()): void {
  saveRecord(recordVisit(loadRecord(), now));
}
