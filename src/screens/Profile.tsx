import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { deleteAllData, parseBackup, readAllData, restoreBackup, setDisplayName } from '../db/backup';
import { ValidationError } from '../db/transactions';
import type { Backup } from '../lib/export';
import { downloadFile, makeBackup } from '../lib/export';
import { toISODate } from '../lib/dates';
import { getTheme, setTheme, type ThemeChoice } from '../lib/theme';
import { useInstall } from '../lib/install';
import { useSheetLink } from '../lib/useUrlSheet';
import { inputClass } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { Column, Columns } from '../components/Columns';

export function Profile() {
  return (
    <>
      <header className="flex flex-col gap-3">
        <Link to="/" className="flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-accent no-underline lg:hidden">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Home
        </Link>
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">Profile & settings</h1>
      </header>
      <Columns>
        <Column>
          <NameSection />
          <AppearanceSection />
          <InstallSection />
        </Column>
        <Column>
          <DataSection />
          <HelpSection />
        </Column>
      </Columns>
      <p className="m-0 text-center text-xs text-muted">Finance OS {__APP_VERSION__} · Your data stays on this device.</p>
    </>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 className="m-0 text-[15px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function NameSection() {
  const id = useId();
  const toast = useToast();
  const stored = useLiveQuery(async () => (await db.settings.get('displayName'))?.value ?? '', []);
  const [name, setName] = useState<string | null>(null);
  const value = name ?? stored ?? '';
  const dirty = name !== null && name.trim() !== (stored ?? '');

  async function save() {
    if (!dirty) return;
    await setDisplayName(value);
    setName(null);
    toast({ message: value.trim() ? `Hi, ${value.trim()}` : 'Name removed' });
  }

  return (
    <Card title="You">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-1.5"
      >
        <label htmlFor={id} className="text-[13px] font-semibold text-muted">
          Your name <span className="font-medium">(for the greeting)</span>
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            value={value}
            maxLength={30}
            autoComplete="given-name"
            placeholder="e.g. Kurt"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!dirty}
            className="min-h-[46px] flex-none rounded-sm bg-accent px-4 text-sm font-bold text-on-accent disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </Card>
  );
}

function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(getTheme);
  const options: { key: ThemeChoice; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];
  return (
    <Card title="Appearance">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-[14px] bg-raised p-1">
        {options.map((o) => {
          const on = o.key === choice;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setTheme(o.key);
                setChoice(o.key);
              }}
              className={`min-h-10 rounded-[10px] text-sm font-bold ${on ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(16_24_40/0.14)]' : 'text-muted'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="m-0 text-[13px] text-muted">System follows your phone’s light or dark setting.</p>
    </Card>
  );
}

function InstallSection() {
  const { state, install } = useInstall();
  const toast = useToast();
  return (
    <Card title="Install the app">
      {state === 'installed' ? (
        <p className="m-0 text-sm text-pos font-semibold">Installed. Finance OS opens from your home screen and works offline.</p>
      ) : state === 'available' ? (
        <>
          <p className="m-0 text-sm text-muted">Opens in one tap, full screen, and works with no signal.</p>
          <button
            type="button"
            onClick={async () => {
              const ok = await install();
              if (ok) toast({ message: 'Finance OS installed' });
            }}
            className="min-h-11 self-start rounded-sm bg-accent px-4 text-sm font-bold text-on-accent"
          >
            Install Finance OS
          </button>
        </>
      ) : state === 'insecure' ? (
        <p className="m-0 text-sm text-muted">
          Installing needs a secure address. You’re on <b className="text-ink">{location.origin}</b>, which browsers
          won’t install from, so “Add to Home screen” only makes a shortcut that opens in the browser. Open it over
          <b className="text-ink"> https://</b> (or <b className="text-ink">localhost</b>) to install and use it offline.
        </p>
      ) : state === 'ios' ? (
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
          <li>Tap the <b>Share</b> button in Safari’s toolbar.</li>
          <li>Choose <b>Add to Home Screen</b>.</li>
          <li>Tap <b>Add</b>. Finance OS will open full screen and work offline.</li>
        </ol>
      ) : (
        <p className="m-0 text-sm text-muted">
          Installing isn’t on offer in this browser right now. If you’ve already installed Finance OS, open it from
          your home screen or app list. Either way, it works offline in this tab too.
        </p>
      )}
    </Card>
  );
}

function DataSection() {
  const toast = useToast();
  const navigate = useNavigate();
  const sheetLink = useSheetLink();
  const fileRef = useRef<HTMLInputElement>(null);
  const counts = useLiveQuery(async () => ({
    transactions: await db.transactions.count(),
    goals: await db.goals.count(),
    sources: await db.incomeSources.count(),
  }));
  const [storage, setStorage] = useState<{ persisted: boolean | null; usedMB: number | null }>({ persisted: null, usedMB: null });
  const [pending, setPending] = useState<{ data: Backup['data']; exportedAt: string | null; fileName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasData = !!counts && counts.transactions + counts.goals + counts.sources > 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      const persisted = (await navigator.storage?.persisted?.().catch(() => null)) ?? null;
      const est = await navigator.storage?.estimate?.().catch(() => null);
      if (alive) setStorage({ persisted, usedMB: est?.usage != null ? est.usage / 1_048_576 : null });
    })();
    return () => {
      alive = false;
    };
  }, [counts]);

  async function saveSafetyCopy() {
    downloadFile(`finance-os-backup-before-change-${toISODate(new Date())}.json`, JSON.stringify(makeBackup(await readAllData()), null, 2), 'application/json');
  }

  async function onFile(file: File | undefined) {
    setError('');
    setPending(null);
    if (!file) return;
    if (file.size > 20 * 1_048_576) return setError('That file is too large to be a Finance OS backup.');
    try {
      const parsed = parseBackup(await file.text());
      setPending({ ...parsed, fileName: file.name });
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = ''; // allow picking the same file again
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      if (hasData) await saveSafetyCopy();
      await restoreBackup(pending.data);
      setPending(null);
      toast({ message: 'Backup restored' });
      navigate('/');
    } catch {
      setError('Restore failed. Your data was not changed.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteAll() {
    setBusy(true);
    try {
      await deleteAllData();
      setConfirmDelete(false);
      toast({ message: 'All data deleted' });
      navigate('/');
    } catch {
      setError('Could not delete. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

  return (
    <Card title="Your data">
      <p className="m-0 text-sm text-muted">
        {counts ? `${plural(counts.transactions, 'transaction')}, ${plural(counts.goals, 'goal')}, ${plural(counts.sources, 'payday')}` : '…'}
        {storage.usedMB !== null && ` · ${storage.usedMB < 1 ? '<1' : storage.usedMB.toFixed(1)} MB`}
      </p>
      {storage.persisted !== null && (
        <p className={`m-0 text-[13px] ${storage.persisted ? 'text-pos' : 'text-muted'}`}>
          {storage.persisted
            ? 'Protected: the browser won’t clear this data to free up space.'
            : 'Not protected yet: the browser may clear it if space runs low. Installing the app usually fixes this. Keep a backup either way.'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          {...sheetLink({ export: 1 })}
          className="flex min-h-11 items-center justify-center rounded-sm border border-line text-sm font-semibold text-ink no-underline"
        >
          Back up / export
        </Link>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-sm border border-line text-sm font-semibold text-ink"
        >
          Restore backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          aria-label="Choose a backup file"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>

      {pending && (
        <div role="group" aria-label="Confirm restore" className="flex flex-col gap-3 rounded-md bg-accent-soft p-4">
          <p className="m-0 text-sm">
            <b>Replace everything with this backup?</b>{' '}
            {pending.fileName} has {plural(pending.data.transactions.length, 'transaction')}, {plural(pending.data.goals.length, 'goal')} and{' '}
            {plural(pending.data.incomeSources.length, 'payday')}
            {pending.exportedAt ? `, saved ${new Date(pending.exportedAt).toLocaleString()}` : ''}.
            {hasData && ' Your current data will be downloaded as a backup first.'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPending(null)} className="min-h-11 flex-1 rounded-sm border border-line bg-surface text-sm font-semibold text-ink">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={confirmRestore} className="min-h-11 flex-1 rounded-sm bg-accent text-sm font-bold text-on-accent disabled:opacity-50">
              {busy ? 'Restoring…' : 'Replace'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-neg">
          {error}
        </p>
      )}

      {hasData &&
        (confirmDelete ? (
          <div role="group" aria-label="Confirm delete all" className="flex flex-col gap-3 rounded-md bg-neg-soft p-4">
            <p className="m-0 text-sm">
              <b>Delete everything on this device?</b> Transactions, goals, paydays and settings will be gone. This can’t be undone.
            </p>
            <button type="button" onClick={() => void saveSafetyCopy()} className="min-h-11 rounded-sm border border-line bg-surface text-sm font-semibold text-ink">
              Download a backup first
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 flex-1 rounded-sm border border-line bg-surface text-sm font-semibold text-ink">
                Keep my data
              </button>
              <button type="button" disabled={busy} onClick={confirmDeleteAll} className="min-h-11 flex-1 rounded-sm bg-neg text-sm font-bold text-on-accent disabled:opacity-50">
                Delete everything
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 self-start text-sm font-semibold text-neg">
            Delete all data…
          </button>
        ))}
    </Card>
  );
}

function HelpSection() {
  const items: [string, ReactNode][] = [
    ['Does it work offline?', 'Yes. Everything is saved on this device first, so you can log spending with no signal. Nothing is sent to a server.'],
    ['Where is my data?', 'In this browser’s storage on this device only. It doesn’t sync between phones, so use Back up / export to keep a copy or move it.'],
    ['How do I move to a new phone?', 'Back up here, send the file to your new phone, open Finance OS there and choose Restore backup.'],
    ['What does “set aside” mean?', 'Money from a paycheck you’ve planned for something specific, like bills. It no longer counts as available to spend.'],
    ['How is “available to spend” worked out?', 'This month’s income minus spending, money moved to goals, and money set aside.'],
  ];
  return (
    <Card title="Help">
      <div className="flex flex-col">
        {items.map(([q, a]) => (
          <details key={q} className="border-b border-line py-1 last:border-b-0">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">{q}</summary>
            <p className="m-0 pb-3 text-sm text-muted">{a}</p>
          </details>
        ))}
      </div>
    </Card>
  );
}
