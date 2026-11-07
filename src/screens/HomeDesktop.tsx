import { Link } from 'react-router-dom';
import { formatPeso, percentOf } from '../lib/money';
import { formatDaysUntil, formatHeaderDay, formatMonthTag, formatShortDay, fromISODate, greetingFor } from '../lib/dates';
import { formatForeign } from '../lib/text';
import { useSheetLink } from '../lib/useUrlSheet';
import type { HomeData } from '../features/home/useHomeData';
import { displayAmount, displayName, kindLabel } from '../features/activity/activity';
import { goalSheetLink } from '../features/goals/GoalSheet';
import { incomeSourceLink } from '../features/money/IncomeSourceSheet';
import { Trend, Welcome } from './Home';
import { AnimatedPeso } from '../components/AnimatedNumber';

/** Home at ≥1024px, following the desktop design: wide balance card, payday + goals side by side, recent table. */
export function HomeDesktop({ data }: { data: HomeData }) {
  const greeting = greetingFor(new Date().getHours());
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">{formatHeaderDay(data.today)}</span>
          <h1 className="m-0 text-[30px] font-bold tracking-[-0.02em]">
            {data.displayName ? `${greeting}, ${data.displayName}` : greeting}
          </h1>
        </div>
        <Link
          to="/profile"
          aria-label="Profile, settings and help"
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-base font-semibold text-ink no-underline"
        >
          {data.displayName ? data.displayName[0]!.toUpperCase() : '?'}
        </Link>
      </header>

      {data.isEmpty && <Welcome />}

      <div className="grid grid-cols-2 gap-4">
        <BalanceCard summary={data.summary} />
        <PaydayCard payday={data.payday} />
        <GoalsCard goals={data.goals} />
        <RecentCard data={data} />
      </div>
    </>
  );
}

const card = 'flex min-w-0 flex-col rounded-[24px] border border-line bg-surface p-6';

function BalanceCard({ summary }: { summary: HomeData['summary'] }) {
  const { month, changePct } = summary;
  const base = Math.max(month.income, month.spent + month.saved + month.setAside);
  const parts = [
    { key: 'spent', value: month.spent, label: 'spent', cls: 'bg-neg' },
    { key: 'saved', value: month.saved, label: 'saved', cls: 'bg-pos' },
    { key: 'aside', value: month.setAside, label: 'set aside', cls: 'bg-accent' },
  ];
  return (
    <section aria-label="Balance" className={`${card} col-span-full gap-4`}>
      <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Available to spend</span>
      <div className="flex flex-wrap items-baseline gap-3.5">
        <span className={`font-money text-[60px] leading-none font-bold tracking-[-0.03em] tabular-nums ${month.available < 0 ? 'text-neg' : ''}`}>
          <AnimatedPeso value={month.available} />
        </span>
        {changePct !== null && Number.isFinite(changePct) && <Trend pct={changePct} />}
      </div>
      <div
        role="img"
        aria-label={`${parts.map((p) => `${formatPeso(p.value)} ${p.label}`).join(', ')}, of ${formatPeso(month.income)} income this month`}
        className="anim-reveal flex h-3 overflow-hidden rounded-[6px] bg-raised"
      >
        {parts.map((p) => (
          <div key={p.key} className={p.cls} style={{ width: `${percentOf(p.value, base)}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted tabular-nums">
        {parts.map((p) => (
          <span key={p.key}>
            <b className="text-ink">{formatPeso(p.value)}</b> {p.label}
          </span>
        ))}
        <span>of {formatPeso(month.income)} this month</span>
      </div>
    </section>
  );
}

function PaydayCard({ payday }: { payday: HomeData['payday'] }) {
  const sheetLink = useSheetLink();
  if (!payday) {
    return (
      <section aria-label="Next payday" className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-accent-soft p-6">
        <span className="text-xs font-semibold tracking-[0.06em] text-accent uppercase">Next payday</span>
        <span className="flex flex-col gap-1">
          <span className="text-[22px] font-bold">Add your payday</span>
          <span className="text-sm text-muted">See how long until your next salary lands, and split it when it does.</span>
        </span>
        <Link
          {...incomeSourceLink('new')}
          className="press mt-auto flex min-h-11 items-center justify-center self-start rounded-sm bg-accent px-4 text-sm font-bold text-on-accent no-underline transition-opacity hover:opacity-90"
        >
          Set it up →
        </Link>
      </section>
    );
  }
  const { source, date, daysAway } = payday;
  const foreign = source.foreign ? `${formatForeign(source.foreign.amount)} ${source.foreign.currency}, ` : '';
  // The date tile already shows the day, so the line underneath doesn't repeat it.
  const detail = `${foreign}every ${source.intervalDays} days`;
  return (
    <section aria-label="Next payday" className="flex min-w-0 flex-col gap-4 rounded-[24px] bg-accent-soft p-6">
      <span className="text-xs font-semibold tracking-[0.06em] text-accent uppercase">Next payday · {formatDaysUntil(daysAway)}</span>
      <Link to="/money" className="flex items-center gap-4 text-inherit no-underline">
        <span className="flex h-[60px] w-14 flex-none flex-col items-center justify-center rounded-sm bg-surface">
          <span className="text-[11px] font-bold tracking-[0.06em] text-accent">{formatMonthTag(date)}</span>
          <span className="text-[22px] leading-none font-bold">{fromISODate(date).getDate()}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[22px] font-bold">
            {source.name} · {formatPeso(source.amount)}
          </span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
      </Link>
      {/* Pinned to the bottom so it lines up with the Goals card beside it. */}
      <Link
        {...sheetLink({ paycheck: source.id! })}
        className="press mt-auto flex min-h-11 items-center justify-center self-start rounded-sm bg-accent px-4 text-sm font-bold text-on-accent no-underline transition-opacity hover:opacity-90"
      >
        Plan this paycheck →
      </Link>
    </section>
  );
}

function GoalsCard({ goals }: { goals: HomeData['goals'] }) {
  return (
    <section aria-label="Goals" className={`${card} gap-4`}>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-base font-bold">Goals</h2>
        <Link to="/goals" className="text-[13px] font-semibold text-accent no-underline">
          All goals
        </Link>
      </div>
      {goals.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          No goals yet.{' '}
          <Link {...goalSheetLink('new')} className="font-semibold text-accent no-underline">
            Create one
          </Link>
        </p>
      ) : (
        goals.slice(0, 3).map(({ goal, pct }) => (
          <div key={goal.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-3 text-sm tabular-nums">
              <b className="truncate">{goal.name}</b>
              <span className="text-muted">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${goal.name} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 overflow-hidden rounded-[6px] bg-raised"
            >
              <div className={`anim-bar h-full rounded-[6px] ${pct >= 100 ? 'bg-pos' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function RecentCard({ data }: { data: HomeData }) {
  const sheetLink = useSheetLink();
  return (
    <section aria-label="Recent activity" className={`${card} col-span-full px-6 py-5`}>
      <div className="flex items-baseline justify-between pb-2">
        <h2 className="m-0 text-base font-bold">Recent</h2>
        <Link to="/activity" className="text-[13px] font-semibold text-accent no-underline">
          See all
        </Link>
      </div>
      {data.recent.length === 0 ? (
        <p className="m-0 border-t border-line pt-3 text-sm text-muted">Nothing yet. Use “+ Add transaction” to log your first one.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {data.recent.map((tx) => {
            const name = displayName(tx, tx.goalId != null ? data.goalNames.get(tx.goalId) : undefined);
            const amount = displayAmount(tx);
            return (
              <li key={tx.id} className="border-t border-line">
                <Link
                  {...sheetLink({ tx: tx.id! })}
                  aria-label={`${name}, ${kindLabel(tx)}, ${formatShortDay(tx.date)}, ${amount}. Edit`}
                  className="-mx-3 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_88px_120px] items-center gap-4 rounded-sm px-3 py-2.5 text-sm text-ink no-underline transition-colors hover:bg-raised"
                >
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-muted">{kindLabel(tx)}</span>
                  <span className="text-muted">{formatShortDay(tx.date)}</span>
                  <span className={`text-right font-bold tabular-nums ${tx.kind === 'income' ? 'text-pos' : ''}`}>{amount}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
