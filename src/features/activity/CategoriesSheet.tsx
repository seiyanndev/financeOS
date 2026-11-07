import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { formatPeso, percentOf } from '../../lib/money';
import { fromISODate, monthRange, toISODate } from '../../lib/dates';
import { useUrlSheet } from '../../lib/useUrlSheet';
import { Sheet } from '../../components/Sheet';
import { spendingByCategory } from './activity';

const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** `?categories=1` — spending by category, one month at a time. Tap a row to filter Activity. */
export function CategoriesSheet() {
  const { value, close } = useUrlSheet('categories');
  if (value === null) return null;
  return <CategoriesBody onClose={close} />;
}

function CategoriesBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const today = toISODate(new Date());
  const [offset, setOffset] = useState(0);
  const range = monthRange(today, offset);

  const data = useLiveQuery(async () => {
    const txs = await db.transactions.where('date').between(range.start, range.end, true, true).toArray();
    const rows = spendingByCategory(txs, range.start, range.end);
    return { rows, total: rows.reduce((s, r) => s + r.amount, 0) };
  }, [range.start, range.end]);

  function pick(category: string) {
    // Replace the sheet's history entry, so Back returns to the unfiltered list.
    navigate(
      { pathname: '/activity', search: `?${new URLSearchParams({ filter: 'spending', cat: category })}` },
      { replace: true },
    );
  }

  return (
    <Sheet label="Spending by category" onClose={onClose} initialFocus={headingRef}>
      <div className="flex items-center justify-between gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold outline-none">
          Categories
        </h2>
        <div className="flex items-center gap-1">
          <MonthButton label="Previous month" onClick={() => setOffset((o) => o - 1)} d="M15 6l-6 6 6 6" />
          <span aria-live="polite" className="min-w-[128px] text-center text-sm font-semibold">
            {monthLabel.format(fromISODate(range.start))}
          </span>
          <MonthButton label="Next month" onClick={() => setOffset((o) => o + 1)} d="M9 6l6 6-6 6" disabled={offset >= 0} />
        </div>
      </div>

      {data === undefined ? (
        <div aria-busy="true" className="h-40 rounded-lg bg-raised" />
      ) : data.rows.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-muted">No spending this month.</p>
      ) : (
        <>
          <p className="m-0 text-sm text-muted">
            <b className="text-ink tabular-nums">{formatPeso(data.total)}</b> spent across {data.rows.length}{' '}
            {data.rows.length === 1 ? 'category' : 'categories'}
          </p>
          <ul className="m-0 flex list-none flex-col p-0">
            {data.rows.map((r) => {
              const pct = percentOf(r.amount, data.total);
              return (
                <li key={r.category} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => pick(r.category)}
                    className="flex w-full flex-col gap-2 py-3 text-left"
                    aria-label={`${r.category}: ${formatPeso(r.amount)}, ${Math.round(pct)}% of spending. Show transactions`}
                  >
                    <span className="flex w-full items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold">{r.category}</span>
                      <span className="text-[15px] font-bold tabular-nums">{formatPeso(r.amount)}</span>
                    </span>
                    <span className="flex w-full items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-[6px] bg-raised">
                        <span className="anim-bar block h-full rounded-[6px] bg-neg" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-[86px] flex-none text-right text-xs text-muted tabular-nums">
                        {Math.round(pct)}% · {r.count} {r.count === 1 ? 'item' : 'items'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Sheet>
  );
}

function MonthButton({ label, onClick, d, disabled }: { label: string; onClick: () => void; d: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-sm border border-line bg-surface text-ink disabled:opacity-30"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  );
}
