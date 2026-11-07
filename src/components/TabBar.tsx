import { Link, NavLink } from 'react-router-dom';
import type { ComponentType } from 'react';
import { addSheetLink } from '../features/add/useAddSheet';
import { ActivityIcon, GoalsIcon, HomeIcon, InsightsIcon, MoneyIcon, PlusIcon } from './icons';

export const TABS: { to: string; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/money', label: 'Money', Icon: MoneyIcon },
  { to: '/activity', label: 'Activity', Icon: ActivityIcon },
  { to: '/goals', label: 'Goals', Icon: GoalsIcon },
  { to: '/insights', label: 'Insights', Icon: InsightsIcon },
];

/** Bottom navigation with the floating + button that opens the Add sheet. */
export function TabBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden">
      <div className="relative mx-auto max-w-[480px]">
        <Link
          {...addSheetLink('expense')}
          aria-label="Add a transaction"
          className="pointer-events-auto absolute right-[var(--gutter)] bottom-[calc(100%+12px)] flex size-[var(--fab-size)] items-center justify-center rounded-lg bg-accent text-on-accent shadow-[0_10px_24px_rgb(16_28_64/0.28)] anim-pop press"
        >
          <PlusIcon size={26} />
        </Link>

        <nav
          aria-label="Main"
          className="pointer-events-auto grid min-h-[var(--tabbar-height)] grid-cols-5 border-t border-line bg-surface px-2 pt-2 pb-[max(22px,env(safe-area-inset-bottom))]"
        >
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[3px] text-[11px] ${
                  isActive ? 'font-bold text-accent' : 'font-medium text-muted'
                }`
              }
            >
              <Icon size={24} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
