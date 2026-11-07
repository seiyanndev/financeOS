import { Link, NavLink } from 'react-router-dom';
import { addSheetLink } from '../features/add/useAddSheet';
import { TABS } from './TabBar';
import { AnimatedLogo } from './brand/AnimatedLogo';

/** Desktop navigation (≥1024px), replacing the bottom tab bar and the floating + button. */
export function Sidebar() {
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-dvh w-[240px] flex-none flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-4 py-7 lg:flex"
    >
      <Link to="/" className="flex items-center gap-2.5 px-2.5 pb-[22px] text-ink no-underline">
        <AnimatedLogo variant="static" size={34} label="" />
        <span className="text-[17px] font-bold">Finance OS</span>
      </Link>

      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-sm px-3 text-[15px] no-underline ${
              isActive ? 'bg-accent-soft font-bold text-accent' : 'font-medium text-ink hover:bg-raised'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}

      <Link
        {...addSheetLink('expense')}
        className="press mt-4 flex min-h-[46px] items-center justify-center rounded-sm bg-accent text-[15px] font-bold text-on-accent no-underline"
      >
        + Add transaction
      </Link>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `mt-auto flex min-h-11 items-center rounded-sm px-3 text-sm no-underline ${
            isActive ? 'bg-accent-soft font-bold text-accent' : 'font-medium text-muted hover:bg-raised'
          }`
        }
      >
        Profile & settings
      </NavLink>
    </nav>
  );
}
