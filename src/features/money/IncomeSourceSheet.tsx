import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addIncomeSource, deleteIncomeSource, updateIncomeSource } from '../../db/incomeSources';
import { ValidationError } from '../../db/transactions';
import type { IncomeSource } from '../../db/types';
import { centavosToInput, formatAmountInput, parsePeso } from '../../lib/money';
import { addDays, toISODate } from '../../lib/dates';
import { sheetLink, useUrlSheet } from '../../lib/useUrlSheet';
import { AmountInput, Field, inputClass, primaryButtonClass, Sheet, SheetError } from '../../components/Sheet';
import { nextPayDate } from '../home/summary';

/** `?source=new` adds a payday, `?source=<id>` edits one. */
export function incomeSourceLink(source: 'new' | number) {
  return sheetLink({ source });
}

const CYCLES = [
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 15, label: 'Every 15 days' },
  { days: 30, label: 'Every 30 days' },
];
const KINDS = ['salary', 'freelance', 'other'];

export function IncomeSourceSheet() {
  const { value, close } = useUrlSheet('source');
  if (value === null) return null;
  if (value === 'new') return <SourceForm onClose={close} />;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return <Missing onClose={close} />;
  return <EditSource id={id} onClose={close} />;
}

function EditSource({ id, onClose }: { id: number; onClose: () => void }) {
  const source = useLiveQuery(async () => (await db.incomeSources.get(id)) ?? null, [id]);
  if (source === undefined) return null;
  if (!source) return <Missing onClose={onClose} />;
  return <SourceForm source={source} onClose={onClose} />;
}

function Missing({ onClose }: { onClose: () => void }) {
  useEffect(onClose, [onClose]);
  return null;
}

function SourceForm({ source, onClose }: { source?: IncomeSource; onClose: () => void }) {
  const editing = source?.id != null;
  const today = toISODate(new Date());
  const nameRef = useRef<HTMLInputElement>(null);
  const ids = {
    name: useId(), amount: useId(), cycle: useId(), next: useId(), kind: useId(),
    foreign: useId(), currency: useId(), foreignAmount: useId(), error: useId(),
  };

  const [name, setName] = useState(source?.name ?? '');
  const [amountText, setAmountText] = useState(source ? centavosToInput(source.amount) : '');
  const [intervalDays, setIntervalDays] = useState(source?.intervalDays ?? 15);
  const [customText, setCustomText] = useState(String(source?.intervalDays ?? 15));
  const [custom, setCustom] = useState(() => !!source && !CYCLES.some((c) => c.days === source.intervalDays));
  // Editing shows the *upcoming* payday rather than whatever old date the cycle was anchored on.
  const [nextDate, setNextDate] = useState(source ? nextPayDate(source, today) : addDays(today, 7));
  const [kind, setKind] = useState(source?.kind ?? 'salary');
  const [hasForeign, setHasForeign] = useState(!!source?.foreign);
  const [currency, setCurrency] = useState(source?.foreign?.currency ?? '');
  const [foreignText, setForeignText] = useState(source?.foreign ? centavosToInput(source.foreign.amount) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const amount = parsePeso(amountText);
    if (!name.trim()) return setError('Give this income a name.');
    if (amount === null || amount <= 0) return setError('Enter how much lands, in pesos.');
    const foreignAmount = parsePeso(foreignText);
    if (hasForeign && (foreignAmount === null || foreignAmount <= 0)) {
      return setError(`Enter the amount in ${currency.trim().toUpperCase() || 'the other currency'}.`);
    }

    setBusy(true);
    setError('');
    const input = {
      name,
      amount,
      intervalDays,
      anchorDate: nextDate,
      kind,
      ...(hasForeign ? { foreign: { currency, amount: foreignAmount! } } : {}),
    };
    try {
      if (editing) await updateIncomeSource(source.id!, input);
      else await addIncomeSource(input);
      onClose();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await deleteIncomeSource(source!.id!);
      onClose();
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
    <Sheet label={editing ? `Edit ${source.name}` : 'Add income source'} onClose={onClose} initialFocus={nameRef}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <h2 className="m-0 text-xl font-bold">{editing ? 'Edit payday' : 'Add a payday'}</h2>

        <Field id={ids.name} label="Name">
          <input
            ref={nameRef}
            id={ids.name}
            value={name}
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. Main Job"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col items-center gap-1">
          <label htmlFor={ids.amount} className="text-[13px] font-semibold text-muted">
            Lands in your account (₱)
          </label>
          <AmountInput id={ids.amount} value={amountText} onChange={setAmountText} className="text-[40px] text-pos" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex min-h-9 items-center gap-2.5 text-sm font-semibold">
            <input
              id={ids.foreign}
              type="checkbox"
              checked={hasForeign}
              onChange={(e) => setHasForeign(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            Paid in another currency
          </label>
          {hasForeign && (
            <div className="grid grid-cols-[96px_1fr] gap-2.5">
              <Field id={ids.currency} label="Currency">
                <input
                  id={ids.currency}
                  value={currency}
                  maxLength={3}
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder="AUD"
                  onChange={(e) => setCurrency(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
                  className={`${inputClass} uppercase`}
                />
              </Field>
              <Field id={ids.foreignAmount} label="Amount in that currency">
                <input
                  id={ids.foreignAmount}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="300"
                  value={foreignText}
                  onChange={(e) => {
                    const next = formatAmountInput(e.target.value);
                    if (next !== null) setForeignText(next);
                  }}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
            </div>
          )}
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-semibold text-muted">How often</legend>
          <div className="flex flex-wrap gap-2">
            {CYCLES.map((c) => (
              <button
                key={c.days}
                type="button"
                aria-pressed={!custom && intervalDays === c.days}
                onClick={() => {
                  setCustom(false);
                  setIntervalDays(c.days);
                }}
                className={chip(!custom && intervalDays === c.days)}
              >
                {c.label}
              </button>
            ))}
            <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={chip(custom)}>
              Custom
            </button>
          </div>
          {custom && (
            <div className="mt-2.5 flex items-center gap-2 text-sm">
              <label htmlFor={ids.cycle}>Every</label>
              <input
                id={ids.cycle}
                inputMode="numeric"
                value={customText}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setCustomText(digits);
                  if (digits) setIntervalDays(Number(digits));
                }}
                className={`${inputClass} w-20 text-center tabular-nums`}
              />
              <span>days</span>
            </div>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-2.5">
          <Field id={ids.next} label="Next payday">
            <input
              id={ids.next}
              type="date"
              value={nextDate}
              onChange={(e) => e.target.value && setNextDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id={ids.kind} label="Type">
            <select
              id={ids.kind}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={`${inputClass} capitalize`}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k[0]!.toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <SheetError id={ids.error}>{error}</SheetError>}

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add payday'}
        </button>

        {editing &&
          (confirmDelete ? (
            <div role="group" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-md bg-neg-soft p-4">
              <p className="m-0 text-sm">
                <b>Remove {source.name}?</b> Money already received from it stays in your history.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-11 flex-1 rounded-sm border border-line bg-surface text-sm font-semibold text-ink"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className="min-h-11 flex-1 rounded-sm bg-neg text-sm font-bold text-on-accent disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="-mt-2 min-h-11 text-sm font-semibold text-neg">
              Remove this payday
            </button>
          ))}
      </form>
    </Sheet>
  );
}
