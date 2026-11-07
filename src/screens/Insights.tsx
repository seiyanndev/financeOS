import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { IncomeSource } from '../db/types';
import { formatPeso } from '../lib/money';
import { formatShortDay, fromISODate, monthRange, toISODate } from '../lib/dates';
import { useSheetLink } from '../lib/useUrlSheet';
import { healthScore, MAX_POINTS, savingsStreakMonths, type Health } from '../features/insights/health';
import { monthGrid, paydaysInRange } from '../features/insights/calendar';
import { incomeSourceLink } from '../features/money/IncomeSourceSheet';
import { Column, Columns } from '../components/Columns';

const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' });
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Insights() {
  const sheetLink = useSheetLink();
  const data = useLiveQuery(async () => {
    const today = toISODate(new Date());
    const [txs, goals, sources] = await Promise.all([db.transactions.toArray(), db.goals.toArray(), db.incomeSources.toArray()]);
    return {
      today,
      sources,
      txDates: new Set(txs.map((t) => t.date)),
      health: healthScore(txs, goals, today),
      streak: savingsStreakMonths(txs, today),
    };
  });

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Insights</h1>
        <Link
          {...sheetLink({ export: 1 })}
          className="flex min-h-10 items-center rounded-sm border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink no-underline"
        >
          Export
        </Link>
      </header>
      {data === undefined ? (
        <div aria-busy="true" aria-label="Loading" className="h-48 rounded-lg bg-raised" />
      ) : (
        <Columns>
          <Column>
            <HealthCard health={data.health} />
            <Streak months={data.streak} />
          </Column>
          <Column>
            <Calendar today={data.today} sources={data.sources} txDates={data.txDates} />
          </Column>
        </Columns>
      )}
    </>
  );
}

function HealthCard({ health }: { health: Health }) {
  const { score, rating, basis, factors } = health;
  const ring = score === null ? 0 : score;
  const tone = score === null ? '--raised' : score >= 60 ? '--pos' : score >= 40 ? '--accent' : '--neg';
  return (
    <section aria-label="Financial health" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-[18px]">
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={score === null ? 'Health score not available yet' : `Health score ${score} out of 100`}
          className="anim-ring flex size-[84px] flex-none items-center justify-center rounded-full"
          style={{ '--ring': `${ring}%`, background: `conic-gradient(var(${tone}) var(--ring), var(--raised) 0)` } as CSSProperties}
        >
          <span className="flex size-[68px] items-center justify-center rounded-full bg-surface font-money text-[28px] font-bold">
            {score === null ? '—' : <AnimatedNumber value={score} />}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Health score</span>
          <span className="text-xl font-bold">{rating}</span>
          <span className="text-[13px] text-muted">
            {score === null
              ? 'Log a month of income and spending to see it.'
              : `Based on ${monthName.format(fromISODate(basis.start))}${basis.end < monthRange(basis.start).end ? ' so far' : ''}`}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {factors.map((f) => (
          <div key={f.key} className="flex min-w-0 flex-col gap-0.5 rounded-sm bg-raised px-3 py-2.5">
            <span className="text-xs text-muted">{f.label}</span>
            <span
              className={`text-sm font-bold ${
                f.points === null ? 'text-muted' : f.points >= MAX_POINTS * 0.7 ? 'text-pos' : f.points >= MAX_POINTS * 0.4 ? 'text-ink' : 'text-neg'
              }`}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
      <details className="text-[13px] text-muted">
        <summary className="min-h-8 cursor-pointer font-semibold text-accent">How is this worked out?</summary>
        <ul className="mt-2 mb-0 flex list-disc flex-col gap-1.5 pl-5">
          <li><b className="text-ink">Savings rate:</b> share of income moved to goals or set aside. 20% or more earns full marks.</li>
          <li><b className="text-ink">Spending control:</b> spending as a share of income. Half or less is full marks; spending it all scores zero.</li>
          <li><b className="text-ink">Income stability:</b> this month’s income against the two months before. Within 10% is full marks.</li>
          <li><b className="text-ink">Goal progress:</b> money moved to dated goals against what they need each month.</li>
          <li>Each is worth 25 points. Anything without enough data is left out and the rest are scaled to 100.</li>
        </ul>
      </details>
    </section>
  );
}

function Streak({ months }: { months: number }) {
  return (
    <section aria-label="Savings streak" className="flex items-center gap-3.5 rounded-lg bg-pos-soft p-4">
      <span className="font-money text-4xl leading-none font-bold text-pos"><AnimatedNumber value={months} /></span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">month savings streak</span>
        <span className="text-[13px] text-muted">
          {months === 0 ? 'Move money to a goal or set some aside to start one.' : 'Months in a row you’ve put money aside.'}
        </span>
      </div>
    </section>
  );
}

function Calendar({ today, sources, txDates }: { today: string; sources: IncomeSource[]; txDates: Set<string> }) {
  const [offset, setOffset] = useState(0);
  const range = monthRange(today, offset);
  const paydays = paydaysInRange(sources, range);
  const payDates = new Set(paydays.map((p) => p.date));
  const cells = monthGrid(range);
  const label = monthYear.format(fromISODate(range.start));

  return (
    <section aria-label={`${label} calendar`} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="m-0 text-[15px] font-bold" aria-live="polite">{label}</h2>
          <span className="text-xs text-muted">
            {sources.length === 0 ? 'No paydays set up' : `${paydays.length} ${paydays.length === 1 ? 'payday' : 'paydays'}`}
          </span>
        </div>
        <div className="flex gap-1">
          <NavButton label="Previous month" d="M15 6l-6 6 6 6" onClick={() => setOffset((o) => o - 1)} />
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="min-h-10 rounded-sm px-2 text-[13px] font-semibold text-accent">
              Today
            </button>
          )}
          <NavButton label="Next month" d="M9 6l6 6-6 6" onClick={() => setOffset((o) => o + 1)} />
        </div>
      </div>

      {/* Visual only: the payday list below carries the same information for screen readers. */}
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center tabular-nums">
        {WEEK.map((w, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const pay = payDates.has(d);
            const isToday = d === today;
            return (
              <span
                key={d}
                className={`relative flex h-[34px] items-center justify-center rounded-[10px] text-[13px] ${
                  pay ? 'bg-accent font-bold text-on-accent' : 'font-medium text-ink'
                } ${isToday ? 'ring-2 ring-ink ring-inset' : ''}`}
              >
                {fromISODate(d).getDate()}
                {txDates.has(d) && !pay && (
                  <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-muted" />
                )}
              </span>
            );
          })}
      </div>

      {paydays.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-1">
          {paydays.map((p) => (
            <li key={`${p.date}-${p.source.id}`} className="flex justify-between gap-3 text-[13px] tabular-nums">
              <span>
                <b>{formatShortDay(p.date)}</b> <span className="text-muted">· {p.source.name}</span>
              </span>
              <span className="font-bold text-pos">{formatPeso(p.source.amount)}</span>
            </li>
          ))}
        </ul>
      ) : sources.length === 0 ? (
        <Link {...incomeSourceLink('new')} className="text-[13px] font-semibold text-accent no-underline">
          Add a payday to see it here
        </Link>
      ) : null}
    </section>
  );
}

function NavButton({ label, d, onClick }: { label: string; d: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-sm border border-line bg-surface text-ink"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  );
}
