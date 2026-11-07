import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatPeso, percentOf } from '../lib/money';
import { formatHeaderDay, fromISODate, monthRange, toISODate } from '../lib/dates';
import { TransactionRow } from '../components/TransactionRow';
import { useSheetLink } from '../lib/useUrlSheet';
import { filterTransactions, groupByDay, monthSpend, spendingByCategory, type ActivityFilter, type CategoryTotal } from '../features/activity/activity';
import { Column, Columns } from '../components/Columns';

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'spending', label: 'Spending' },
  { key: 'income', label: 'Income' },
  { key: 'goals', label: 'Goals' },
  { key: 'aside', label: 'Set aside' },
];
const PAGE = 100;
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function Activity() {
  // Filter, search and category live in the URL so Back and reload keep them.
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.find((f) => f.key === params.get('filter'))?.key ?? 'all') as ActivityFilter;
  const query = params.get('q') ?? '';
  const category = params.get('cat');
  const [limit, setLimit] = useState(PAGE);
  const sheetLink = useSheetLink();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '' || (k === 'filter' && v === 'all')) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  const data = useLiveQuery(async () => {
    const [txs, goals] = await Promise.all([db.transactions.toArray(), db.goals.toArray()]);
    return { txs, goalNames: new Map(goals.map((g) => [g.id, g.name])) };
  });

  const today = toISODate(new Date());
  const month = monthRange(today);
  const summary = useMemo(() => (data ? monthSpend(data.txs, month.start, today) : null), [data, month.start, today]);
  const filtered = useMemo(
    () => (data ? filterTransactions(data.txs, { filter, query, category }, data.goalNames) : []),
    [data, filter, query, category],
  );
  const groups = useMemo(() => groupByDay(filtered.slice(0, limit)), [filtered, limit]);

  const chip = (on: boolean) =>
    `min-h-9 rounded-full border px-3.5 text-[13px] font-semibold ${
      on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink'
    }`;

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Activity</h1>
        <Link
          {...sheetLink({ categories: 1 })}
          className="flex min-h-10 items-center rounded-sm border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink no-underline"
        >
          Categories
        </Link>
      </header>

      {/* Desktop: list on the left, sticky summary panel on the right. Phone order is kept with order-*. */}
      <Columns className="lg:grid-cols-[minmax(0,1fr)_320px]">
      <Column>
      <label className="order-1 flex min-h-12 items-center gap-2.5 lg:order-none rounded-[14px] border border-line bg-surface px-3.5 text-muted">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search payee, note or amount"
          aria-label="Search activity"
          enterKeyHint="search"
          className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
        />
      </label>

      <div role="group" aria-label="Filter" className="order-2 -mt-0.5 flex flex-wrap gap-2 lg:order-none lg:mt-0">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => update({ filter: f.key })} className={chip(filter === f.key)}>
            {f.label}
          </button>
        ))}
        {category && (
          <button
            type="button"
            onClick={() => update({ cat: null })}
            aria-label={`Remove category filter: ${category}`}
            className="flex min-h-9 items-center gap-1.5 rounded-full border border-neg bg-neg-soft px-3.5 text-[13px] font-semibold text-neg"
          >
            {category}
            <span aria-hidden="true" className="text-base leading-none">×</span>
          </button>
        )}
      </div>

      <section aria-label="Transactions" className="order-4 flex flex-col lg:order-none">
        {data === undefined ? (
          <div aria-busy="true" aria-label="Loading" className="h-40 rounded-lg bg-raised" />
        ) : groups.length === 0 ? (
          <p className="my-6 text-center text-sm text-muted">
            {data.txs.length === 0 ? 'No transactions yet. Tap + to add one.' : 'Nothing here for this filter.'}
          </p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.date} className="flex flex-col">
                <h2 className="m-0 pt-3.5 pb-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
                  {g.date === today ? 'Today' : formatHeaderDay(g.date)}
                </h2>
                <ul className="m-0 list-none p-0">
                  {g.items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} goalName={data.goalNames.get(tx.goalId!)} tinted showDate={false} />
                  ))}
                </ul>
              </div>
            ))}
            {filtered.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="mt-4 min-h-11 rounded-sm border border-line bg-surface text-sm font-semibold text-ink"
              >
                Show more ({filtered.length - limit} older)
              </button>
            )}
          </>
        )}
      </section>
      </Column>
      <Column className="lg:sticky lg:top-8">
      {summary && (
          <section aria-label={`${monthName.format(fromISODate(month.start))} summary`} className="order-3 grid grid-cols-3 gap-2 lg:order-none lg:grid-cols-1">
            <Stat label="Spent" value={formatPeso(summary.spent)} />
            <Stat label="Per day" value={formatPeso(summary.perDay)} />
            <Stat label="Top" value={summary.top ?? '—'} />
          </section>
        )}
        {data && (
          <CategoryPanel
            rows={spendingByCategory(data.txs, month.start, month.end)}
            active={category}
            onPick={(cat) => update({ filter: 'spending', cat })}
          />
        )}
      </Column>
      </Columns>
    </>
  );
}

/** Desktop-only: this month's top categories, each one a filter. Phones use the Categories sheet. */
function CategoryPanel({ rows, active, onPick }: { rows: CategoryTotal[]; active: string | null; onPick: (cat: string) => void }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <section aria-label="Top categories this month" className="hidden flex-col gap-1 rounded-lg border border-line bg-surface p-4 lg:flex">
      <h2 className="m-0 pb-2 text-[15px] font-bold">Top categories</h2>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted">No spending yet this month.</p>
      ) : (
        rows.slice(0, 6).map((r) => {
          const pct = percentOf(r.amount, total);
          const on = r.category === active;
          return (
            <button
              key={r.category}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(r.category)}
              className={`-mx-2 flex flex-col gap-1.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-raised ${on ? 'bg-neg-soft' : ''}`}
            >
              <span className="flex w-full justify-between gap-2 text-sm">
                <span className="font-semibold">{r.category}</span>
                <span className="font-bold tabular-nums">{formatPeso(r.amount)}</span>
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-[6px] bg-raised">
                <span className="anim-bar block h-full rounded-[6px] bg-neg" style={{ width: `${pct}%` }} />
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface p-3">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className="truncate text-base font-bold tabular-nums">{value}</span>
    </div>
  );
}
