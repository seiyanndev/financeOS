import { useCallback } from 'react';
import { sheetLink, useUrlSheet } from '../../lib/useUrlSheet';

export type AddType = 'expense' | 'income' | 'goal';
const TYPES: readonly AddType[] = ['expense', 'income', 'goal'];
const EXTRAS = ['goalId'] as const;

/** Link that opens the Add sheet over whatever screen is showing; `goalId` preselects a goal. */
export function addSheetLink(type: AddType, opts: { goalId?: number } = {}) {
  return sheetLink(opts.goalId != null ? { add: type, goalId: opts.goalId } : { add: type });
}

export function useAddSheet() {
  const { value, params, close, replace } = useUrlSheet('add', EXTRAS);
  const type = value === null ? null : TYPES.includes(value as AddType) ? (value as AddType) : 'expense';
  const goalIdParam = Number(params.get('goalId'));
  const goalId = Number.isSafeInteger(goalIdParam) && goalIdParam > 0 ? goalIdParam : undefined;
  const setType = useCallback((t: AddType) => replace(t), [replace]);
  return { type, goalId, close, setType };
}
