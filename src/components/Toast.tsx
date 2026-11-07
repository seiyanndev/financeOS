import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastOptions {
  message: string;
  action?: { label: string; onClick: () => void | Promise<void> };
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

/** `const toast = useToast(); toast({ message: 'Deleted', action: { label: 'Undo', onClick } })` */
export const useToast = () => useContext(ToastContext);

const DURATION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, id: nextId.current++ });
  }, []);

  useEffect(() => {
    if (!toast) return;
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS);
    return () => window.clearTimeout(timer.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Always mounted so screen readers announce changes; sits above the tab bar and + button. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-height)+var(--fab-size)+24px)] z-40 lg:bottom-6 flex justify-center px-3"
      >
        {toast && (
          <div
            key={toast.id}
            className="toast pointer-events-auto flex w-full max-w-[456px] items-center gap-3 rounded-[14px] bg-ink py-2 pr-2 pl-4 text-sm text-bg shadow-[0_8px_24px_rgb(8_12_22/0.25)]"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={async () => {
                  setToast(null);
                  await toast.action!.onClick();
                }}
                className="min-h-10 rounded-sm px-3 font-bold text-accent-soft"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
