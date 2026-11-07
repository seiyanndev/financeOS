import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addTransaction, ValidationError } from '../../db/transactions';
import { parsePeso } from '../../lib/money';
import { toISODate } from '../../lib/dates';
import { sheetLink } from '../../lib/useUrlSheet';
import { AmountInput, Field, inputClass, primaryButtonClass, Sheet, SheetError } from '../../components/Sheet';
import { useAddSheet, type AddType } from './useAddSheet';
import { EXPENSE_CATEGORIES } from './categories';


const TYPE_TABS: { type: AddType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
  { type: 'goal', label: 'To goal' },
];

const AMOUNT_TONE: Record<AddType, string> = {
  expense: 'text-neg',
  income: 'text-pos',
  goal: 'text-accent',
};

interface Option {
  key: string;
  label: string;
  goalId?: number;
  sourceId?: number;
}

/** Mounted once in the shell; shows itself whenever the URL has `?add=`. */
export function AddSheet() {
  const { type, goalId, close, setType } = useAddSheet();
  if (!type) return null;
  return <AddSheetForm type={type} initialGoalId={goalId} onClose={close} onTypeChange={setType} />;
}

function AddSheetForm({
  type,
  initialGoalId,
  onClose,
  onTypeChange,
}: {
  type: AddType;
  initialGoalId?: number;
  onClose: () => void;
  onTypeChange: (t: AddType) => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const ids = { amount: useId(), note: useId(), date: useId(), error: useId() };

  const [amountText, setAmountText] = useState('');
  const [categoryKey, setCategoryKey] = useState<string | null>(
    initialGoalId != null ? `goal-${initialGoalId}` : null,
  );
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const lists = useLiveQuery(async () => {
    const [goals, sources] = await Promise.all([db.goals.orderBy('order').toArray(), db.incomeSources.toArray()]);
    return { goals, sources };
  });

  const options: Option[] = useMemo(() => {
    if (type === 'expense') return EXPENSE_CATEGORIES.map((c) => ({ key: c, label: c }));
    if (type === 'income') {
      return [
        ...(lists?.sources ?? []).map((s) => ({ key: `source-${s.id}`, label: s.name, sourceId: s.id })),
        { key: 'Other', label: 'Other' },
      ];
    }
    return (lists?.goals ?? []).map((g) => ({ key: `goal-${g.id}`, label: g.name, goalId: g.id }));
  }, [type, lists]);

  // Falls back to the first option, as the reference does, when switching type.
  const selected = options.find((o) => o.key === categoryKey) ?? options[0];
  const amount = parsePeso(amountText);

  function changeType(t: AddType) {
    setCategoryKey(null);
    setError('');
    onTypeChange(t);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (amount === null || amount <= 0) return setError('Enter an amount greater than ₱0.');
    if (!selected) return setError(type === 'goal' ? 'Create a goal first.' : 'Pick a category.');

    setSaving(true);
    setError('');
    try {
      await addTransaction({
        kind: type,
        amount,
        category: selected.label,
        note,
        date,
        goalId: selected.goalId,
        sourceId: selected.sourceId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setSaving(false);
    }
  }

  const cta =
    type === 'expense' ? 'Save expense' : type === 'income' ? 'Save income' : `Move to ${selected?.label ?? 'goal'}`;
  const noGoals = type === 'goal' && lists !== undefined && options.length === 0;

  return (
    <Sheet label="Add a transaction" onClose={onClose} initialFocus={amountRef}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <div role="group" aria-label="Type" className="grid grid-cols-3 gap-1 rounded-[14px] bg-raised p-1">
          {TYPE_TABS.map((t) => {
            const on = t.type === type;
            return (
              <button
                key={t.type}
                type="button"
                aria-pressed={on}
                onClick={() => changeType(t.type)}
                className={`min-h-10 rounded-[10px] text-sm font-bold ${
                  on ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(16_24_40/0.14)]' : 'text-muted'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1">
          <label htmlFor={ids.amount} className="text-[13px] font-semibold text-muted">
            Amount
          </label>
          <AmountInput
            id={ids.amount}
            inputRef={amountRef}
            value={amountText}
            onChange={setAmountText}
            className={`text-[52px] ${AMOUNT_TONE[type]}`}
            invalid={!!error && (amount === null || amount <= 0)}
            describedBy={error ? ids.error : undefined}
          />
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-semibold text-muted">{type === 'goal' ? 'Goal' : 'Category'}</legend>
          {noGoals ? (
            <p className="m-0 text-sm text-muted">
              No goals yet.{' '}
              <Link {...sheetLink({ goal: 'new' })} replace className="font-semibold text-accent no-underline">
                Create one
              </Link>{' '}
              to start saving toward it.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.map((o) => {
                const on = o.key === selected?.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategoryKey(o.key)}
                    className={`min-h-9 rounded-full border px-3.5 text-[13px] font-semibold ${
                      on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-2.5">
          <Field id={ids.note} label="Note">
            <input
              id={ids.note}
              value={note}
              maxLength={80}
              placeholder={type === 'expense' ? 'e.g. GrabFood' : 'Optional'}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id={ids.date} label="Date">
            <input
              id={ids.date}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value || toISODate(new Date()))}
              className={inputClass}
            />
          </Field>
        </div>

        {error && <SheetError id={ids.error}>{error}</SheetError>}

        <button type="submit" disabled={saving || noGoals} className={primaryButtonClass}>
          {saving ? 'Saving…' : cta}
        </button>
      </form>
    </Sheet>
  );
}
