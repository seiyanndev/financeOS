import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { readAllData } from '../../db/backup';
import { downloadFile, makeBackup, transactionsToCSV } from '../../lib/export';
import { toISODate } from '../../lib/dates';
import { useUrlSheet } from '../../lib/useUrlSheet';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';

/** `?export=1` */
export function ExportSheet() {
  const { value, close } = useUrlSheet('export');
  if (value === null) return null;
  return <ExportBody onClose={close} />;
}

function ExportBody({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const count = useLiveQuery(() => db.transactions.count());
  const stamp = toISODate(new Date());

  async function run(kind: 'csv' | 'json') {
    setBusy(true);
    try {
      const all = await readAllData();
      const { transactions, goals, incomeSources } = all;
      if (kind === 'csv') {
        downloadFile(`finance-os-transactions-${stamp}.csv`, transactionsToCSV(transactions, goals, incomeSources), 'text/csv;charset=utf-8');
      } else {
        const backup = makeBackup(all);
        downloadFile(`finance-os-backup-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json');
      }
      onClose();
      toast({ message: kind === 'csv' ? 'Transactions exported' : 'Backup saved' });
    } catch {
      toast({ message: 'Export failed. Please try again.' });
      setBusy(false);
    }
  }

  return (
    <Sheet label="Export" onClose={onClose} initialFocus={headingRef}>
      <div className="flex flex-col gap-0.5">
        <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold outline-none">
          Export
        </h2>
        <p className="m-0 text-[13px] text-muted">
          Your data lives only on this device. Files are made here and never uploaded.
        </p>
      </div>
      <ExportOption
        title="Transactions (CSV)"
        detail={`${count ?? '…'} transactions, for Excel, Google Sheets or Numbers`}
        disabled={busy || !count}
        onClick={() => run('csv')}
      />
      <ExportOption
        title="Full backup (JSON)"
        detail="Everything: transactions, goals, paydays and settings. Keep it somewhere safe."
        disabled={busy}
        onClick={() => run('json')}
      />
    </Sheet>
  );
}

function ExportOption({ title, detail, disabled, onClick }: { title: string; detail: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 text-left text-ink disabled:opacity-50"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-accent-soft text-accent">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
    </button>
  );
}
