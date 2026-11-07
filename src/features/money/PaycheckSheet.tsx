import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { recordPaycheck, TEMPLATE_KEY } from '../../db/paycheck';
import { ValidationError } from '../../db/transactions';
import type { Goal, IncomeSource } from '../../db/types';
import { centavosToInput, formatPeso, parsePeso } from '../../lib/money';
import { formatShortDay, toISODate } from '../../lib/dates';
import { sheetLink, useUrlSheet } from '../../lib/useUrlSheet';
import { AmountInput, Field, inputClass, primaryButtonClass, Sheet, SheetError } from '../../components/Sheet';
import { goalProgress, nextPayday, nextPayDate } from '../home/summary';
import { clampPct, parseTemplate, splitPaycheck, type SplitTemplate } from './split';

/** `?paycheck=next` picks the soonest payday; `?paycheck=<sourceId>` a specific one. */
export function paycheckLink(source: 'next' | number = 'next') {
  return sheetLink({ paycheck: source });
}

const OTHER = 'other';

export function PaycheckSheet() {
  const { value, close } = useUrlSheet('paycheck');
  const data = useLiveQuery(async () => {
    if (value === null) return null;
    const [sources, goals, transfers, templateSetting] = await Promise.all([
      db.incomeSources.toArray(),
      db.goals.orderBy('order').toArray(),
      db.transactions.where('kind').equals('goal').toArray(),
      db.settings.get(TEMPLATE_KEY),
    ]);
    // Finished goals drop out of the split.
    const openGoals = goals.filter((g) => goalProgress(g, transfers).pct < 100);
    return { sources, goals: openGoals, template: parseTemplate(templateSetting?.value) };
  }, [value]);

  if (value === null || !data) return null;
  const today = toISODate(new Date());
  const requested = Number(value);
  const initial =
    data.sources.find((s) => s.id === requested) ?? nextPayday(data.sources, today)?.source ?? undefined;
  return <PaycheckForm {...data} initialSource={initial} today={today} onClose={close} />;
}

function PaycheckForm({
  sources,
  goals,
  template,
  initialSource,
  today,
  onClose,
}: {
  sources: IncomeSource[];
  goals: Goal[];
  template: SplitTemplate;
  initialSource?: IncomeSource;
  today: string;
  onClose: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const ids = { amount: useId(), date: useId(), error: useId() };

  const defaultDate = (s?: IncomeSource) => {
    if (!s) return today;
    const payday = nextPayDate(s, today);
    return payday <= today ? payday : today;
  };

  const [sourceKey, setSourceKey] = useState<string>(initialSource ? String(initialSource.id) : OTHER);
  const [amountText, setAmountText] = useState(initialSource ? centavosToInput(initialSource.amount) : '');
  const [date, setDate] = useState(defaultDate(initialSource));
  const [pcts, setPcts] = useState<SplitTemplate>(() => {
    const p: SplitTemplate = { aside: template.aside ?? 0 };
    for (const g of goals) p[`goal-${g.id}`] = template[`goal-${g.id}`] ?? 0;
    return p;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const source = sources.find((s) => String(s.id) === sourceKey);
  const amount = parsePeso(amountText) ?? 0;
  const rows = useMemo(
    () => [
      ...goals.map((g) => ({ key: `goal-${g.id}`, label: g.name, hint: 'Goal' })),
      { key: 'aside', label: 'Set aside', hint: 'Bills & planned costs' },
    ],
    [goals],
  );
  const split = splitPaycheck(amount, rows.map((r) => ({ key: r.key, pct: pcts[r.key] ?? 0 })));
  const over = split.totalPct > 100;

  function pickSource(key: string) {
    setSourceKey(key);
    const s = sources.find((x) => String(x.id) === key);
    if (s) {
      setAmountText(centavosToInput(s.amount));
      setDate(defaultDate(s));
    }
  }

  function setPct(key: string, value: number) {
    setPcts((p) => ({ ...p, [key]: clampPct(value) }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (amount <= 0) return setError('Enter the amount you received.');
    if (over) return setError('The split adds up to more than 100%.');
    setBusy(true);
    setError('');
    try {
      await recordPaycheck({
        sourceId: source?.id,
        label: source?.name ?? 'Other',
        amount,
        date,
        goals: goals.map((g) => ({ goalId: g.id!, amount: split.amounts[`goal-${g.id}`] ?? 0 })),
        setAside: split.amounts.aside ?? 0,
        template: pcts,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save. Please try again.');
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `min-h-9 rounded-full border px-3.5 text-[13px] font-semibold ${
      on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
    }`;

  return (
    <Sheet label="Split a paycheck" onClose={onClose} initialFocus={amountRef}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-xl font-bold">Split a paycheck</h2>
          <p className="m-0 text-[13px] text-muted">
            Records the income and moves each share in one step. Your percentages are remembered.
          </p>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-semibold text-muted">From</legend>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sourceKey === String(s.id)}
                onClick={() => pickSource(String(s.id))}
                className={chip(sourceKey === String(s.id))}
              >
                {s.name}
              </button>
            ))}
            <button type="button" aria-pressed={sourceKey === OTHER} onClick={() => setSourceKey(OTHER)} className={chip(sourceKey === OTHER)}>
              Other
            </button>
          </div>
        </fieldset>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={ids.amount} className="text-[13px] font-semibold text-muted">
              Amount received
            </label>
            <AmountInput id={ids.amount} inputRef={amountRef} value={amountText} onChange={setAmountText} className="text-[34px] text-pos" />
          </div>
          <Field id={ids.date} label="Date">
            <input id={ids.date} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputClass} w-[150px]`} />
          </Field>
        </div>

        <fieldset className="m-0 flex flex-col border-0 p-0">
          <legend className="mb-1 p-0 text-[13px] font-semibold text-muted">Split</legend>
          {rows.map((r) => {
            const pct = pcts[r.key] ?? 0;
            const inputId = `${ids.amount}-${r.key}`;
            return (
              <div key={r.key} className="flex items-center gap-3 border-b border-line py-2.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <label htmlFor={inputId} className="truncate text-[15px] font-semibold">
                    {r.label}
                  </label>
                  <span className="text-xs text-muted tabular-nums">
                    {formatPeso(split.amounts[r.key] ?? 0)} · {r.hint}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <StepButton label={`Less to ${r.label}`} onClick={() => setPct(r.key, pct - 5)} disabled={pct <= 0}>
                    −
                  </StepButton>
                  <span className="relative">
                    <input
                      id={inputId}
                      inputMode="numeric"
                      value={String(pct)}
                      onChange={(e) => setPct(r.key, Number(e.target.value.replace(/\D/g, '').slice(0, 3) || 0))}
                      className="h-10 w-14 rounded-sm border border-line bg-bg pr-5 text-right text-[15px] font-semibold text-ink tabular-nums"
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[13px] text-muted">
                      %
                    </span>
                  </span>
                  <StepButton label={`More to ${r.label}`} onClick={() => setPct(r.key, pct + 5)} disabled={pct >= 100}>
                    +
                  </StepButton>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-3 text-[15px]">
            <span className="font-semibold">Left to spend</span>
            <b className={`tabular-nums ${over ? 'text-neg' : ''}`} aria-live="polite">
              {over ? `Over by ${split.totalPct - 100}%` : formatPeso(split.left)}
            </b>
          </div>
        </fieldset>

        {error && <SheetError id={ids.error}>{error}</SheetError>}

        <button type="submit" disabled={busy || over || amount <= 0} className={primaryButtonClass}>
          {busy ? 'Saving…' : `Record ${formatPeso(amount)} & split`}
        </button>
        {source && date > today && (
          <p className="-mt-2 m-0 text-center text-xs text-muted">Dated {formatShortDay(date)}, in the future.</p>
        )}
      </form>
    </Sheet>
  );
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-sm border border-line bg-surface text-lg font-semibold text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
