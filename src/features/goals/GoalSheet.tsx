import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addGoal, deleteGoal, updateGoal } from '../../db/goals';
import { ValidationError } from '../../db/transactions';
import type { Goal } from '../../db/types';
import { centavosToInput, formatPeso, parsePeso } from '../../lib/money';
import { sheetLink, useUrlSheet } from '../../lib/useUrlSheet';
import { AmountInput, Field, inputClass, primaryButtonClass, Sheet, SheetError } from '../../components/Sheet';

const EXTRAS = ['focus'] as const;

/** `?goal=new` creates, `?goal=<id>` edits; `&focus=date` jumps straight to the date. */
export function goalSheetLink(goal: 'new' | number, opts: { focus?: 'date' } = {}) {
  return sheetLink(opts.focus ? { goal, focus: opts.focus } : { goal });
}

/** Mounted once in the shell; shows itself whenever the URL has `?goal=`. */
export function GoalSheet() {
  const { value, params, close } = useUrlSheet('goal', EXTRAS);
  if (value === null) return null;
  if (value === 'new') return <GoalForm onClose={close} />;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return <Missing onClose={close} />;
  return <EditGoal id={id} focusDate={params.get('focus') === 'date'} onClose={close} />;
}

function EditGoal({ id, focusDate, onClose }: { id: number; focusDate: boolean; onClose: () => void }) {
  // `null` = loaded but missing; `undefined` = still loading.
  const result = useLiveQuery(async () => {
    const goal = (await db.goals.get(id)) ?? null;
    if (!goal) return { goal };
    const transfers = await db.transactions.where('goalId').equals(id).toArray();
    return { goal, saved: transfers.reduce((sum, t) => sum + t.amount, 0) };
  }, [id]);
  if (result === undefined) return null;
  if (!result.goal) return <Missing onClose={onClose} />;
  return <GoalForm goal={result.goal} saved={result.saved} focusDate={focusDate} onClose={onClose} />;
}

/** Bad or deleted id in the URL: just drop the param. */
function Missing({ onClose }: { onClose: () => void }) {
  useEffect(onClose, [onClose]);
  return null;
}

function GoalForm({
  goal,
  saved = 0,
  focusDate = false,
  onClose,
}: {
  goal?: Goal;
  saved?: number;
  focusDate?: boolean;
  onClose: () => void;
}) {
  const editing = goal?.id != null;
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const ids = { name: useId(), target: useId(), date: useId(), error: useId() };

  const [name, setName] = useState(goal?.name ?? '');
  const [targetText, setTargetText] = useState(goal ? centavosToInput(goal.target) : '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const target = parsePeso(targetText);
    if (!name.trim()) return setError('Give the goal a name.');
    if (target === null || target <= 0) return setError('Enter a target greater than ₱0.');

    setBusy(true);
    setError('');
    try {
      const input = { name, target, targetDate: targetDate || undefined };
      if (editing) await updateGoal(goal.id!, input);
      else await addGoal(input);
      onClose();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await deleteGoal(goal!.id!);
      onClose();
    } catch {
      setError('Could not delete. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Sheet
      label={editing ? `Edit ${goal.name}` : 'New goal'}
      onClose={onClose}
      initialFocus={editing && focusDate ? dateRef : nameRef}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <h2 className="m-0 text-xl font-bold">{editing ? 'Edit goal' : 'New goal'}</h2>

        <Field id={ids.name} label="Name">
          <input
            ref={nameRef}
            id={ids.name}
            value={name}
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. Laptop Fund"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col items-center gap-1">
          <label htmlFor={ids.target} className="text-[13px] font-semibold text-muted">
            Target amount
          </label>
          <AmountInput
            id={ids.target}
            value={targetText}
            onChange={setTargetText}
            className="text-[40px] text-accent"
            describedBy={error ? ids.error : undefined}
          />
          {editing && saved > 0 && <span className="text-xs text-muted">{formatPeso(saved)} saved so far</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={ids.date} className="text-[13px] font-semibold text-muted">
              Target date <span className="font-medium">(optional)</span>
            </label>
            {targetDate && (
              <button
                type="button"
                onClick={() => setTargetDate('')}
                className="min-h-8 px-1 text-[13px] font-semibold text-accent"
              >
                Clear
              </button>
            )}
          </div>
          <input
            ref={dateRef}
            id={ids.date}
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <SheetError id={ids.error}>{error}</SheetError>}

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
        </button>

        {editing &&
          (confirmDelete ? (
            <div role="group" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-md bg-neg-soft p-4">
              <p className="m-0 text-sm">
                <b>Delete {goal.name}?</b>{' '}
                {saved > 0
                  ? `The ${formatPeso(saved)} you moved here stays in your history.`
                  : 'This can’t be undone.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-11 flex-1 rounded-sm border border-line bg-surface text-sm font-semibold text-ink"
                >
                  Keep goal
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className="min-h-11 flex-1 rounded-sm bg-neg text-sm font-bold text-on-accent disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="-mt-2 min-h-11 text-sm font-semibold text-neg"
            >
              Delete goal
            </button>
          ))}
      </form>
    </Sheet>
  );
}
