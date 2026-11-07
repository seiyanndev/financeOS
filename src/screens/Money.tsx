import { Link } from 'react-router-dom';
import { formatPeso, percentOf } from '../lib/money';
import { formatDaysUntil, formatShortDay, fromISODate } from '../lib/dates';
import { formatForeign } from '../lib/text';
import { useMoneyData } from '../features/money/useMoneyData';
import { incomeSourceLink } from '../features/money/IncomeSourceSheet';
import { paycheckLink } from '../features/money/PaycheckSheet';
import { addSheetLink } from '../features/add/useAddSheet';
import { Column, Columns } from '../components/Columns';
import { AnimatedPeso } from '../components/AnimatedNumber';

const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function Money() {
  const data = useMoneyData();
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Money</h1>
        <p className="m-0 text-sm text-muted">What comes in, and where each peso goes.</p>
      </header>
      {data === undefined ? (
        <div aria-busy="true" aria-label="Loading" className="h-40 rounded-lg bg-raised" />
      ) : (
        <MoneyBody data={data} />
      )}
    </>
  );
}

type Data = NonNullable<ReturnType<typeof useMoneyData>>;

function MoneyBody({ data }: { data: Data }) {
  const month = monthName.format(fromISODate(data.monthStart));
  const next = data.paydays[0];
  return (
    <>
    <IncomeHeader data={data} month={month} />
    <Columns>
      <Column>
      <Paydays paydays={data.paydays} />
      <WhereItWent data={data} month={month} />
      </Column>
      <Column>
      {next ? (
        <Link
          {...paycheckLink(next.source.id!)}
          className="press flex min-h-16 items-center justify-between gap-3 rounded-lg bg-accent px-[18px] py-3.5 text-on-accent no-underline"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-bold">Plan the {formatShortDay(next.date)} paycheck</span>
            <span className="text-[13px] opacity-85">Split {formatPeso(next.source.amount)} using your template</span>
          </span>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      ) : null}
      <Received data={data} />
      </Column>
    </Columns>
    </>
  );
}

function IncomeHeader({ data, month }: { data: Data; month: string }) {
  const pct = data.incomeChangePct;
  const rounded = pct === null || !Number.isFinite(pct) ? null : Math.round(pct);
  const count = `${data.incomeCount} ${data.incomeCount === 1 ? 'payment' : 'payments'}`;
  return (
    <section aria-label="Income this month" className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Income · {month}</span>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-money text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">
          <AnimatedPeso value={data.month.income} />
        </span>
        <span className="text-[13px] font-semibold text-muted">
          {count}
          {rounded !== null && rounded !== 0 && (
            <span className={rounded > 0 ? 'text-pos' : 'text-neg'}>
              {' · '}
              <span aria-hidden="true">{rounded > 0 ? '↑' : '↓'} </span>
              <span className="sr-only">{rounded > 0 ? 'up' : 'down'} </span>
              {Math.abs(rounded)}%
            </span>
          )}
        </span>
      </div>
    </section>
  );
}

function Paydays({ paydays }: { paydays: Data['paydays'] }) {
  return (
    <section aria-label="Paydays" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-bold">Paydays</h2>
        <Link {...incomeSourceLink('new')} className="text-[13px] font-semibold text-accent no-underline">
          Add source
        </Link>
      </div>
      {paydays.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-line bg-surface p-4 text-sm text-muted">
          Add your salary or freelance income to see your next payday and split each paycheck.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-line bg-surface p-0">
          {paydays.map(({ source, date, daysAway }) => {
            const detail = [
              source.foreign
                ? `${formatForeign(source.foreign.amount)} ${source.foreign.currency} ≈ ${formatPeso(source.amount)}`
                : formatPeso(source.amount),
              `every ${source.intervalDays} days`,
              ...(source.kind && source.kind !== 'salary' ? [source.kind] : []),
            ].join(' · ');
            return (
              <li key={source.id} className="border-b border-line last:border-b-0">
                <Link
                  {...incomeSourceLink(source.id!)}
                  aria-label={`${source.name}, next payday ${formatShortDay(date)}. Edit`}
                  className="flex items-center gap-3 px-4 py-3.5 text-ink no-underline transition-colors hover:bg-raised"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{source.name}</span>
                    <span className="text-xs text-muted">{detail}</span>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-0.5">
                    <span className="text-[13px] font-bold text-accent">{formatShortDay(date)}</span>
                    <span className="text-xs text-muted">{formatDaysUntil(daysAway)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WhereItWent({ data, month }: { data: Data; month: string }) {
  const { income, spent, saved, setAside, available } = data.month;
  const overspent = available < 0;
  // When outflows exceed income, show shares of the outflow total so the bar still adds to 100%.
  const base = Math.max(income, spent + saved + setAside);
  const parts = [
    { key: 'spent', label: 'Spent', value: spent, swatch: 'bg-neg' },
    { key: 'saved', label: 'Saved', value: saved, swatch: 'bg-pos' },
    { key: 'aside', label: 'Set aside', value: setAside, swatch: 'bg-accent' },
    { key: 'left', label: overspent ? 'Over' : 'Left', value: Math.abs(available), swatch: 'bg-raised border border-line' },
  ];
  return (
    <section aria-label="Where the money went" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="m-0 text-[15px] font-bold">
        Where {month}’s {formatPeso(income)} went
      </h2>
      {base > 0 ? (
        <div role="img" aria-label={parts.map((p) => `${p.label} ${formatPeso(p.value)}`).join(', ')} className="anim-reveal flex h-3.5 gap-0.5 overflow-hidden rounded-[8px]">
          {parts.slice(0, overspent ? 3 : 4).map((p) =>
            p.value > 0 ? (
              <div key={p.key} className={p.key === 'left' ? 'bg-raised' : p.swatch} style={{ width: `${percentOf(p.value, base)}%` }} />
            ) : null,
          )}
        </div>
      ) : (
        <div className="h-3.5 rounded-[8px] bg-raised" />
      )}
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2.5 tabular-nums">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden="true" className={`size-2.5 flex-none rounded-[3px] ${p.key === 'left' && overspent ? 'bg-neg-soft border border-neg' : p.swatch}`} />
            <dt className="flex-1 text-muted">{p.label}</dt>
            <dd className={`m-0 font-bold ${p.key === 'left' && overspent ? 'text-neg' : ''}`}>{formatPeso(p.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Received({ data }: { data: Data }) {
  return (
    <section aria-label="Received" className="flex flex-col">
      <div className="flex items-baseline justify-between pb-1.5">
        <h2 className="m-0 text-[15px] font-bold">Received</h2>
        <Link {...addSheetLink('income')} className="text-[13px] font-semibold text-accent no-underline">
          Log income
        </Link>
      </div>
      {data.received.length === 0 ? (
        <p className="m-0 py-2 text-[13px] text-muted">Nothing received yet this month.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {data.received.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-b border-line py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[15px] font-semibold">{t.category}</span>
                <span className="text-xs text-muted">
                  {formatShortDay(t.date)}
                  {t.note ? ` · ${t.note}` : ''}
                </span>
              </div>
              <span className="text-[15px] font-bold text-pos tabular-nums">{formatPeso(t.amount, { sign: 'always' })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
