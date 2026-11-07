import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { formatAmountInput } from '../lib/money';

/**
 * Bottom sheet on a native <dialog>: showModal() gives focus trapping, Esc and an inert page.
 * Esc and backdrop clicks call `onClose` rather than closing the dialog directly, so the URL
 * (which owns open/closed state) stays the single source of truth.
 */
export function Sheet({
  label,
  onClose,
  initialFocus,
  children,
}: {
  label: string;
  onClose: () => void;
  /** React doesn't write `autofocus` to the DOM, so pass the element to focus on open. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    initialFocus?.current?.focus();
    // Only on mount: re-focusing on every render would steal focus while typing.
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop
      }}
      className="sheet mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[var(--radius-sheet)] border-0 bg-surface p-0 text-ink lg:my-auto lg:max-h-[85dvh] lg:rounded-[var(--radius-sheet)]"
    >
      <div className="flex flex-col gap-[18px] px-[var(--gutter)] pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))] lg:pt-6 lg:pb-7">
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-[3px] bg-line lg:hidden" />
        {children}
      </div>
    </dialog>
  );
}

export const inputClass =
  'min-h-[46px] w-full min-w-0 rounded-sm border border-line bg-bg px-3 text-[15px] font-medium text-ink';

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Big centred peso input. Keeps the raw text (with thousands separators) in the parent;
 * parse it with parsePeso. The invisible copy sizes the field to exactly fit its text.
 */
export function AmountInput({
  id,
  value,
  onChange,
  inputRef,
  className = 'text-[52px]',
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className={`flex items-baseline gap-1 font-money leading-tight font-bold tracking-[-0.03em] ${className}`}>
      <span aria-hidden="true">₱</span>
      <span className="inline-grid">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre tabular-nums">
          {value || '0'}
        </span>
        <input
          ref={inputRef}
          id={id}
          size={1} /* drop the ~20-char default width so the sizer span decides */
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0"
          value={value}
          onChange={(e) => {
            const next = formatAmountInput(e.target.value);
            if (next !== null) onChange(next);
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="col-start-1 row-start-1 w-full min-w-0 border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-inherit tabular-nums outline-none placeholder:text-line"
        />
      </span>
    </div>
  );
}

export function SheetError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="m-0 -mb-2 text-[13px] font-semibold text-neg">
      {children}
    </p>
  );
}

export const primaryButtonClass =
  'min-h-[54px] rounded-md bg-accent text-base font-bold text-on-accent disabled:opacity-50';
