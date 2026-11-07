import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useInstall } from '../../lib/install';
import { loadRecord, recordDismissal, saveRecord, shouldOffer } from '../../lib/installPrompt';
import { primaryButtonClass, Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { AnimatedLogo } from '../../components/brand/AnimatedLogo';

const SHOW_DELAY_MS = 2500;
const SHEET_PARAMS = ['add', 'goal', 'source', 'paycheck', 'tx', 'categories', 'export'];

/**
 * Offers installing on Home, after the 2nd visit, when nothing else is open. Never on first load.
 * Mounted once in the shell.
 */
export function InstallPrompt() {
  const { state, install } = useInstall();
  const location = useLocation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const shownThisSession = useRef(false);

  const params = new URLSearchParams(location.search);
  const quietHome = location.pathname === '/' && !SHEET_PARAMS.some((p) => params.has(p));
  const offerable = state === 'available' || state === 'ios';

  useEffect(() => {
    if (open || shownThisSession.current || !quietHome || !offerable) return;
    if (!shouldOffer(loadRecord(), Date.now())) return;
    const t = window.setTimeout(() => {
      if (document.querySelector('dialog[open]')) return; // something else is open; try next visit
      shownThisSession.current = true;
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(t); // navigating away or opening a sheet cancels it
  }, [open, quietHome, offerable]);

  // Close if the situation changes underneath (e.g. installed from the browser menu).
  useEffect(() => {
    if (open && state === 'installed') setOpen(false);
  }, [open, state]);

  if (!open) return null;

  const dismiss = () => {
    saveRecord(recordDismissal(loadRecord(), Date.now()));
    setOpen(false);
  };

  return (
    <InstallSheet
      ios={state === 'ios'}
      onNotNow={dismiss}
      onInstall={async () => {
        const accepted = await install();
        if (accepted) {
          setOpen(false);
          toast({ message: 'Finance OS installed' });
        } else {
          dismiss(); // they declined the browser's own prompt
        }
      }}
    />
  );
}

function InstallSheet({ ios, onNotNow, onInstall }: { ios: boolean; onNotNow: () => void; onInstall: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <Sheet label="Install Finance OS" onClose={onNotNow} initialFocus={headingRef}>
      <div className="flex items-center gap-3.5">
        {/* Plays the brand intro when the sheet opens. */}
        <AnimatedLogo variant="intro" size={60} label="" className="flex-none" />
        <div className="flex flex-col gap-0.5">
          <h2 ref={headingRef} tabIndex={-1} className="m-0 text-xl font-bold outline-none">
            Install Finance OS
          </h2>
          <span className="text-[13px] text-muted">Add it to your home screen</span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
        <Benefit title="Opens in one tap" detail="Full screen, no browser bar" d="M13 2L4 14h7l-1 8 9-12h-7z" />
        <Benefit title="Works offline" detail="Log spending with no signal" d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
        <Benefit
          title="Keeps your data safer"
          detail="Browsers are far less likely to clear an installed app’s data"
          d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"
        />
      </ul>

      {ios ? (
        <>
          <ol className="m-0 flex list-decimal flex-col gap-1.5 rounded-md bg-raised py-3 pr-3 pl-8 text-sm">
            <li>Tap <b>Share</b> in Safari’s toolbar.</li>
            <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
          <button type="button" onClick={onNotNow} className={primaryButtonClass}>
            Got it
          </button>
        </>
      ) : (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onNotNow}
            className="min-h-[52px] flex-1 rounded-md border border-line bg-transparent text-[15px] font-semibold text-ink"
          >
            Not now
          </button>
          <button type="button" onClick={onInstall} className="min-h-[52px] flex-[2] rounded-md bg-accent text-[15px] font-bold text-on-accent">
            Install
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Benefit({ title, detail, d }: { title: string; detail: ReactNode; d: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-7 flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} />
        </svg>
      </span>
      <span>
        <b>{title}</b>
        <br />
        <span className="text-muted">{detail}</span>
      </span>
    </li>
  );
}
