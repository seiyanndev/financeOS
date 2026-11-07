import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { AnimatedPeso } from '../components/AnimatedNumber';
import { formatPeso, percentOf } from '../lib/money';
import { fromISODate } from '../lib/dates';
import { useGoalsData, type GoalItem } from '../features/goals/useGoalsData';
import { goalSheetLink } from '../features/goals/GoalSheet';
import { addSheetLink } from '../features/add/useAddSheet';

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

export function Goals() {
  const data = useGoalsData();

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Goals</h1>
        <Link
          {...goalSheetLink('new')}
          className="flex min-h-10 items-center rounded-sm bg-accent-soft px-3.5 text-[13px] font-bold text-accent no-underline"
        >
          New goal
        </Link>
      </header>

      {data === undefined ? (
        <div aria-busy="true" aria-label="Loading" className="h-40 rounded-lg bg-raised" />
      ) : data.items.length === 0 ? (
        <EmptyGoals />
      ) : (
        <>
          <Summary saved={data.saved} target={data.target} />
          <section aria-label="Goal list" className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
            {data.items.map((item) => (
              <GoalCard key={item.goal.id} item={item} />
            ))}
          </section>
        </>
      )}
    </>
  );
}

function Summary({ saved, target }: { saved: number; target: number }) {
  const pct = Math.min(100, Math.floor(percentOf(saved, target)));
  return (
    <section aria-label="All goals" className="flex flex-col gap-2.5 lg:max-w-[560px]">
      <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Saved toward goals</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-money text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">
          <AnimatedPeso value={saved} />
        </span>
        <span className="text-sm text-muted">of {formatPeso(target)}</span>
      </div>
      <div
        role="progressbar"
        aria-label="All goals progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 overflow-hidden rounded-[6px] bg-raised"
      >
        <div className="anim-bar h-full rounded-[6px] bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function GoalCard({ item }: { item: GoalItem }) {
  const { goal, saved, pct, plan } = item;
  const reached = plan.status === 'reached';

  return (
    <article className="flex flex-col gap-3.5 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-3.5">
        <div
          role="img"
          aria-label={`${pct}% saved`}
          className="anim-ring flex size-14 flex-none items-center justify-center rounded-full"
          style={{ '--ring': `${pct}%`, background: `conic-gradient(var(${reached ? '--pos' : '--accent'}) var(--ring), var(--raised) 0)` } as CSSProperties}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-surface text-[13px] font-bold tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 truncate text-base font-bold">{goal.name}</h2>
            <Link
              {...goalSheetLink(goal.id!)}
              aria-label={`Edit ${goal.name}`}
              className="flex-none text-[13px] font-semibold text-accent no-underline"
            >
              Edit
            </Link>
          </div>
          <span className="text-[13px] text-muted tabular-nums">
            <b className="text-ink">{formatPeso(saved)}</b> of {formatPeso(goal.target)}
          </span>
          <PlanLine item={item} />
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          {...addSheetLink('goal', { goalId: goal.id })}
          className="press flex min-h-11 flex-1 items-center justify-center rounded-sm bg-accent text-sm font-bold text-on-accent no-underline"
        >
          Add money
        </Link>
        <Link
          {...goalSheetLink(goal.id!, { focus: 'date' })}
          className="press flex min-h-11 flex-1 items-center justify-center rounded-sm border border-line text-sm font-semibold text-ink no-underline"
        >
          {goal.targetDate ? 'Change date' : 'Set target date'}
        </Link>
      </div>
    </article>
  );
}

function PlanLine({ item }: { item: GoalItem }) {
  const { plan, goal } = item;
  const by = goal.targetDate ? monthYear.format(fromISODate(goal.targetDate)) : '';
  switch (plan.status) {
    case 'reached':
      return <span className="text-xs font-semibold text-pos">Goal reached</span>;
    case 'no-date':
      return <span className="text-xs text-muted">{formatPeso(goal.target - item.saved)} to go</span>;
    case 'overdue':
      return (
        <span className="text-xs text-neg">
          {formatPeso(plan.left)} to go · target date ({by}) has passed
        </span>
      );
    case 'on-track':
      return (
        <span className="text-xs text-muted">
          {formatPeso(plan.perMonth)}/month to reach by {by}
        </span>
      );
  }
}

function EmptyGoals() {
  return (
    <section className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="m-0 text-[15px] font-bold">Save toward something</h2>
      <p className="m-0 text-sm text-muted">
        A laptop, an emergency fund, a trip. Set a target, move money in from the + button, and see how close you
        are. Add a date and we’ll work out how much to put away each month.
      </p>
      <Link
        {...goalSheetLink('new')}
        className="flex min-h-11 items-center rounded-sm bg-accent px-4 text-sm font-bold text-on-accent no-underline"
      >
        Create your first goal
      </Link>
    </section>
  );
}
