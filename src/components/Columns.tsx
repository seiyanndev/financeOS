import type { ReactNode } from 'react';

/**
 * Two columns on desktop (≥1024px), one stacked column on phones.
 * On phones each <Column> is `display: contents`, so its children flow in DOM order:
 * put the left column's items first and the phone order stays exactly as before.
 */
export function Columns({ children, className = 'lg:grid-cols-2' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-5 lg:grid lg:items-start lg:gap-6 ${className}`}>{children}</div>;
}

export function Column({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6 ${className}`}>{children}</div>;
}
