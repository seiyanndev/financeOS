import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction } from '../db/types';
import { loadSampleData } from '../db/sample';
import { formatPeso, percentOf } from '../lib/money';
import { formatForeign } from '../lib/text';
import { formatDaysUntil, formatHeaderDay, formatMonthTag, fromISODate, greetingFor } from '../lib/dates';
import { useHomeData, type HomeData } from '../features/home/useHomeData';
import { addSheetLink } from '../features/add/useAddSheet';
import { TransactionRow } from '../components/TransactionRow';
import { AnimatedPeso } from '../components/AnimatedNumber';
import { goalSheetLink } from '../features/goals/GoalSheet';
import { incomeSourceLink } from '../features/money/IncomeSourceSheet';
import { paycheckLink } from '../features/money/PaycheckSheet';
import { useIsDesktop } from '../lib/useMediaQuery';
import { HomeDesktop } from './HomeDesktop';
import { AllocateIcon, ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, TargetIcon } from '../components/icons';

export function Home() {
  const data = useHomeData();
  const desktop = useIsDesktop();
  if (!data) return <HomeSkeleton />;
  if (desktop) return <HomeDesktop data={data} />;

  return (
    <>
      <Header name={data.displayName} today={data.today} />
      {data.isEmpty && <Welcome />}
      <Balance summary={data.summary} />
      <PaydayCard payday={data.payday} />
      <QuickActions />
      <TopGoal topGoal={data.topGoal} />
      <Recent recent={data.recent.slice(0, 4)} goalNames={data.goalNames} />
    </>
  );
}

function Header({ name, today }: { name: string; today: string }) {
  const greeting = greetingFor(new Date().getHours());
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] text-muted">{formatHeaderDay(today)}</span>
        <h1 className="m-0 truncate text-[22px] font-bold tracking-[-0.01em]">
          {name ? `${greeting}, ${name}` : greeting}
        </h1>
      </div>
      {/* Settings, help and install live behind the avatar (design note). Menu comes later. */}
      <Link
        to="/profile"
        aria-label="Profile, settings and help"
        className="flex size-11 flex-none items-center justify-center rounded-full border border-line bg-surface text-base font-semibold text-ink"
      >
        {name ? name[0]!.toUpperCase() : '?'}
      </Link>
    </header>
  );
}

export function Welcome() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="m-0 text-[15px] font-bold">Welcome to Finance OS</h2>
      <p className="m-0 text-sm text-muted">
        Everything you add stays on this device. Tap + to log your first expense, or explore with sample data.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await loadSampleData();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load sample data.');
            setBusy(false);
          }
        }}
        className="min-h-11 self-start rounded-sm bg-accent-soft px-4 text-[13px] font-bold text-accent disabled:opacity-60"
      >
        {busy ? 'Loading…' : 'Load sample data'}
      </button>
      {error && <p role="alert" className="m-0 text-[13px] text-neg">{error}</p>}
    </section>
  );
}

function Balance({ summary }: { summary: HomeData['summary'] }) {
  const { month, changePct } = summary;
  // Segments are shares of income; if outflows exceed income, scale to the outflow total instead.
  const base = Math.max(month.income, month.spent + month.saved + month.setAside);
  const segments = [
    { key: 'spent', value: month.spent, className: 'bg-neg', label: 'spent' },
    { key: 'saved', value: month.saved, className: 'bg-pos', label: 'saved' },
    { key: 'aside', value: month.setAside, className: 'bg-accent', label: 'set aside' },
  ];

  return (
    <section aria-label="Balance" className="flex flex-col gap-3.5 pt-1">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Available to spend</span>
        <span
          className={`font-money text-5xl leading-none font-bold tracking-[-0.03em] tabular-nums ${
            month.available < 0 ? 'text-neg' : ''
          }`}
        >
          <AnimatedPeso value={month.available} />
        </span>
        {changePct !== null && Number.isFinite(changePct) && <Trend pct={changePct} />}
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="img"
          aria-label={`${formatPeso(month.spent)} spent, ${formatPeso(month.saved)} saved, ${formatPeso(month.setAside)} set aside, of ${formatPeso(month.income)} income this month`}
          className="anim-reveal flex h-2.5 overflow-hidden rounded-[6px] bg-raised"
        >
          {segments.map((s) => (
            <div key={s.key} className={s.className} style={{ width: `${percentOf(s.value, base)}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted tabular-nums">
          {segments.map((s) => (
            <span key={s.key}>
              <b className="font-semibold text-ink">{formatPeso(s.value)}</b> {s.label}
            </span>
          ))}
          <span>of {formatPeso(month.income)} this month</span>
        </div>
      </div>
    </section>
  );
}

export function Trend({ pct }: { pct: number }) {
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className="text-[13px] font-semibold text-muted">Same as this time last month</span>;
  const up = rounded > 0;
  return (
    <span className={`text-[13px] font-semibold ${up ? 'text-pos' : 'text-neg'}`}>
      <span aria-hidden="true">{up ? '↑' : '↓'} </span>
      <span className="sr-only">{up ? 'Up' : 'Down'} </span>
      {Math.abs(rounded)}% vs this time last month
    </span>
  );
}

function PaydayCard({ payday }: { payday: HomeData['payday'] }) {
  if (!payday) {
    return (
      <Link {...incomeSourceLink('new')} className="flex items-center gap-3.5 rounded-lg bg-accent-soft p-4 text-inherit no-underline">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base font-bold">Add your payday</span>
          <span className="text-[13px] text-muted">See how long until your next salary lands.</span>
        </div>
        <ChevronRightIcon size={20} />
      </Link>
    );
  }

  const { source, date, daysAway } = payday;
  const cadence = `every ${source.intervalDays} days`;
  const detail = source.foreign
    ? `${formatForeign(source.foreign.amount)} ${source.foreign.currency}, ${cadence}`
    : cadence;

  return (
    <Link to="/money" className="flex items-center gap-3.5 rounded-lg bg-accent-soft p-4 text-inherit no-underline">
      <div className="flex h-[52px] w-12 flex-none flex-col items-center justify-center rounded-sm bg-surface">
        <span className="text-[10px] font-bold tracking-[0.06em] text-accent">{formatMonthTag(date)}</span>
        <span className="text-xl leading-none font-bold">{fromISODate(date).getDate()}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] text-muted">Next payday · {formatDaysUntil(daysAway)}</span>
        <span className="truncate text-base font-bold">
          {source.name} · {formatPeso(source.amount)}
        </span>
        <span className="text-xs text-muted">{detail}</span>
      </div>
      <ChevronRightIcon size={20} />
    </Link>
  );
}

function QuickActions() {
  const actions: { link: { to: string | { search: string }; state?: unknown }; label: string; icon: ReactNode; tone: string }[] = [
    { link: addSheetLink('income'), label: 'Receive', icon: <ArrowDownIcon size={22} />, tone: 'text-pos' },
    { link: addSheetLink('expense'), label: 'Spend', icon: <ArrowUpIcon size={22} />, tone: 'text-neg' },
    { link: paycheckLink('next'), label: 'Allocate', icon: <AllocateIcon size={22} />, tone: 'text-accent' },
    { link: { to: '/goals' }, label: 'Goal', icon: <TargetIcon size={22} />, tone: 'text-accent' },
  ];
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <Link key={a.label} {...a.link} className="press flex flex-col items-center gap-1.5 text-xs font-semibold text-ink no-underline">
          <span className={`flex size-[52px] items-center justify-center rounded-md border border-line bg-surface ${a.tone}`}>
            {a.icon}
          </span>
          {a.label}
        </Link>
      ))}
    </nav>
  );
}

function TopGoal({ topGoal }: { topGoal: HomeData['topGoal'] }) {
  if (!topGoal) {
    return (
      <Card label="Goals">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-[15px] font-bold">Save toward something</h2>
          <Link {...goalSheetLink('new')} className="text-[13px] font-semibold text-accent no-underline">New goal</Link>
        </div>
        <p className="m-0 text-[13px] text-muted">Your top goal will show here.</p>
      </Card>
    );
  }
  const { goal, saved, pct } = topGoal;
  return (
    <Card label="Top goal">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 truncate text-[15px] font-bold">{goal.name}</h2>
        <Link to="/goals" className="flex-none text-[13px] font-semibold text-accent no-underline">All goals</Link>
      </div>
      <div
        role="progressbar"
        aria-label={`${goal.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-[6px] bg-raised"
      >
        <div className="anim-bar h-full rounded-[6px] bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[13px] text-muted tabular-nums">
        <span>
          <b className="text-ink">{formatPeso(saved)}</b> of {formatPeso(goal.target)}
        </span>
        <span>{pct}%</span>
      </div>
    </Card>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-4">
      {children}
    </section>
  );
}

function Recent({ recent, goalNames }: { recent: Transaction[]; goalNames: HomeData['goalNames'] }) {
  return (
    <section aria-label="Recent activity" className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between pb-1.5">
        <h2 className="m-0 text-[15px] font-bold">Recent</h2>
        <Link to="/activity" className="text-[13px] font-semibold text-accent no-underline">See all</Link>
      </div>
      {recent.length === 0 ? (
        <p className="m-0 py-2 text-[13px] text-muted">Nothing yet. Tap + to add your first transaction.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {recent.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} goalName={tx.goalId != null ? goalNames.get(tx.goalId) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-5">
      <div className="h-12 w-2/3 rounded-sm bg-raised" />
      <div className="h-24 rounded-lg bg-raised" />
      <div className="h-20 rounded-lg bg-raised" />
    </div>
  );
}
