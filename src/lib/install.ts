import { useSyncExternalStore } from 'react';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | 'installed' // running as an installed app
  | 'available' // the browser offered an install prompt
  | 'ios' // Safari on iPhone/iPad: install is manual via the Share menu
  | 'insecure' // plain http on a non-localhost address (e.g. a LAN IP): browsers refuse to install
  | 'unavailable'; // not supported here, or already installed in another way

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Call once at startup so the event isn't missed before any screen mounts. */
export function initInstallCapture() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function getState(): InstallState {
  if (installedNow || isStandalone()) return 'installed';
  if (deferred) return 'available';
  if (!window.isSecureContext) return 'insecure';
  if (isIOS()) return 'ios';
  return 'unavailable';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useInstall() {
  const state = useSyncExternalStore(subscribe, getState, () => 'unavailable' as InstallState);
  async function install(): Promise<boolean> {
    if (!deferred) return false;
    const e = deferred;
    deferred = null; // a prompt can only be used once
    await e.prompt();
    const { outcome } = await e.userChoice;
    notify();
    return outcome === 'accepted';
  }
  return { state, install };
}
