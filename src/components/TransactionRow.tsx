import { Link } from 'react-router-dom';
import type { Transaction, TransactionKind } from '../db/types';
import { formatShortDay } from '../lib/dates';
import { initials } from '../lib/text';
import { useSheetLink } from '../lib/useUrlSheet';
import { displayAmount, displayName, kindLabel } from '../features/activity/activity';

const TINT: Record<TransactionKind, string> = {
  expense: 'bg-neg-soft text-neg',
  income: 'bg-pos-soft text-pos',
  goal: 'bg-accent-soft text-accent',
  allocation: 'bg-raised text-muted',
};

/**
 * One transaction in a list. Tapping it opens the edit sheet.
 * `tinted` colours the initials by kind (Activity); Home uses the neutral style from its design.
 */
export function TransactionRow({
  tx,
  goalName,
  tinted = false,
  showDate = true,
}: {
  tx: Transaction;
  goalName?: string;
  tinted?: boolean;
  showDate?: boolean;
}) {
  const sheetLink = useSheetLink();
  const name = displayName(tx, goalName);
  const amount = displayAmount(tx);
  return (
    <li className="anim-row border-b border-line">
      <Link
        {...sheetLink({ tx: tx.id! })}
        aria-label={`${name}, ${kindLabel(tx)}, ${formatShortDay(tx.date)}, ${amount}. Edit`}
        className="-mx-2 flex items-center gap-3 rounded-sm px-2 py-2.5 text-ink no-underline transition-colors hover:bg-raised"
      >
        <span
          aria-hidden="true"
          className={`flex size-10 flex-none items-center justify-center rounded-sm text-[13px] font-bold ${
            tinted ? TINT[tx.kind] : 'bg-raised text-muted'
          }`}
        >
          {initials(name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[15px] font-semibold">{name}</span>
          <span className="truncate text-xs text-muted">
            {kindLabel(tx)}
            {showDate && ` · ${formatShortDay(tx.date)}`}
          </span>
        </span>
        <span className={`flex-none text-[15px] font-bold tabular-nums ${tx.kind === 'income' ? 'text-pos' : 'text-ink'}`}>
          {amount}
        </span>
      </Link>
    </li>
  );
}
