import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** The quiet offline notice from the PWA reference. Data is local, so nothing is blocked. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-30 mx-auto flex max-w-[456px] items-center gap-2.5 rounded-[14px] bg-ink px-3.5 py-3 text-[13px] leading-snug text-bg shadow-[0_8px_24px_rgb(8_12_22/0.25)]"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
        <path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.3-1.7M12 20h.01" />
      </svg>
      <span><b>You're offline.</b> Everything you add is saved on this device.</span>
    </div>
  );
}
