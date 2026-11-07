import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { deleteTransaction, restoreTransaction, updateTransaction, ValidationError } from '../../db/transactions';
import type { Goal, IncomeSource, Transaction, TransactionKind } from '../../db/types';
import { centavosToInput, parsePeso } from '../../lib/money';
import { useUrlSheet } from '../../lib/useUrlSheet';
import { AmountInput, Field, inputClass, primaryButtonClass, Sheet, SheetError } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { EXPENSE_CATEGORIES } from '../add/categories';

const TITLES: Record<TransactionKind, string> = {
  expense: 'Edit expense',
  income: 'Edit income',
  goal: 'Edit goal transfer',
  allocation: 'Edit set-aside',
};
const TONE: Record<TransactionKind, string> = {
  expense: 'text-neg',
  income: 'text-pos',
  goal: 'text-accent',
  allocation: 'text-ink',
};

/** `?tx=<id>` — mounted once in the shell. */
export function TransactionSheet() {
  const { value, close } = useUrlSheet('tx');
  const id = value === null ? null : Number(value);
  const data = useLiveQuery(async () => {
    if (id === null) return null;
    if (!Number.isSafeInteger(id) || id <= 0) return { tx: null };
    const [tx, goals, sources] = await Promise.all([
      db.transactions.get(id),
      db.goals.orderBy('order').toArray(),
      db.incomeSources.toArray(),
    ]);
    return { tx: tx ?? null, goals, sources };
  }, [id]);

  if (id === null || !data) return null;
  if (!data.tx) return <Missing onClose={close} />;
  return <EditForm key={data.tx.id} tx={data.tx} goals={data.goals ?? []} sources={data.sources ?? []} onClose={close} />;
}

function Missing({ onClose }: { onClose: () => void }) {
  useEffect(onClose, [onClose]);
  return null;
}

const isLinked = (tx: Transaction, sources: IncomeSource[]) =>
  tx.sourceId != null && sources.some((s) => s.id === tx.sourceId);

interface Option {
  key: string;
  label: string;
  goalId?: number;
  sourceId?: number | null;
}

function EditForm({
  tx,
  goals,
  sources,
  onClose,
}: {
  tx: Transaction;
  goals: Goal[];
  sources: IncomeSource[];
  onClose: () => void;
}) {
  const toast = useToast();
  const amountRef = useRef<HTMLInputElement>(null);
  const ids = { amount: useId(), note: useId(), date: useId(), error: useId() };

  const options: Option[] = useMemo(() => {
    if (tx.kind === 'expense') {
      const list: string[] = [...EXPENSE_CATEGORIES];
      if (!list.includes(tx.category)) list.unshift(tx.category); // keep a custom/legacy category selectable
      return list.map((c) => ({ key: c, label: c }));
    }
    if (tx.kind === 'income') {
      const opts: Option[] = sources.map((s) => ({ key: `source-${s.id}`, label: s.name, sourceId: s.id }));
      // Income from a deleted source keeps its old name as an option.
      if (!isLinked(tx, sources) && tx.category !== 'Other') {
        opts.push({ key: 'own', label: tx.category, sourceId: null });
      }
      opts.push({ key: 'Other', label: 'Other', sourceId: null });
      return opts;
    }
    if (tx.kind === 'goal') {
      const opts: Option[] = goals.map((g) => ({ key: `goal-${g.id}`, label: g.name, goalId: g.id }));
      if (!goals.some((g) => g.id === tx.goalId)) opts.unshift({ key: 'deleted', label: `${tx.category} (deleted)` });
      return opts;
    }
    return [];
  }, [tx, goals, sources]);

  const initialKey =
    tx.kind === 'income'
      ? isLinked(tx, sources)
        ? `source-${tx.sourceId}`
        : tx.category === 'Other'
          ? 'Other'
          : 'own'
      : tx.kind === 'goal'
        ? goals.some((g) => g.id === tx.goalId)
          ? `goal-${tx.goalId}`
          : 'deleted'
        : tx.category;

  const [amountText, setAmountText] = useState(centavosToInput(tx.amount));
  const [categoryKey, setCategoryKey] = useState(initialKey);
  const [note, setNote] = useState(tx.note);
  const [date, setDate] = useState(tx.date);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = options.find((o) => o.key === categoryKey);
  const amount = parsePeso(amountText);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (amount === null || amount <= 0) return setError('Enter an amount greater than ₱0.');
    setBusy(true);
    setError('');
    try {
      await updateTransaction(tx.id!, {
        amount,
        // Deleted goal keeps its stored name; set-aside keeps "Set aside".
        category: tx.kind === 'allocation' || categoryKey === 'deleted' ? tx.category : selected?.label ?? tx.category,
        note,
        date,
        ...(tx.kind === 'goal' && selected?.goalId != null ? { goalId: selected.goalId } : {}),
        ...(tx.kind === 'income' && selected ? { sourceId: selected.sourceId ?? null } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      const removed = await deleteTransaction(tx.id!);
      onClose();
      if (removed) {
        toast({
          message: 'Transaction deleted',
          action: { label: 'Undo', onClick: () => restoreTransaction(removed) },
        });
      }
    } catch {
      setError('Could not delete. Please try again.');
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `min-h-9 rounded-full border px-3.5 text-[13px] font-semibold ${
      on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
    }`;

  return (
    <Sheet label={TITLES[tx.kind]} onClose={onClose} initialFocus={amountRef}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <h2 className="m-0 text-xl font-bold">{TITLES[tx.kind]}</h2>

        <div className="flex flex-col items-center gap-1">
          <label htmlFor={ids.amount} className="text-[13px] font-semibold text-muted">
            Amount
          </label>
          <AmountInput
            id={ids.amount}
            inputRef={amountRef}
            value={amountText}
            onChange={setAmountText}
            className={`text-[44px] ${TONE[tx.kind]}`}
            describedBy={error ? ids.error : undefined}
          />
        </div>

        {options.length > 0 && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[13px] font-semibold text-muted">
              {tx.kind === 'goal' ? 'Goal' : tx.kind === 'income' ? 'From' : 'Category'}
            </legend>
            <div className="flex flex-wrap gap-2">
              {options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={o.key === categoryKey}
                  onClick={() => setCategoryKey(o.key)}
                  className={chip(o.key === categoryKey)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Field id={ids.note} label="Note">
            <input id={ids.note} value={note} maxLength={80} placeholder="Optional" onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </Field>
          <Field id={ids.date} label="Date">
            <input id={ids.date} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        {error && <SheetError id={ids.error}>{error}</SheetError>}

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" disabled={busy} onClick={onDelete} className="-mt-2 min-h-11 text-sm font-semibold text-neg disabled:opacity-50">
          Delete transaction
        </button>
      </form>
    </Sheet>
  );
}
