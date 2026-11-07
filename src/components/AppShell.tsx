import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { AddSheet } from '../features/add/AddSheet';
import { GoalSheet } from '../features/goals/GoalSheet';
import { IncomeSourceSheet } from '../features/money/IncomeSourceSheet';
import { PaycheckSheet } from '../features/money/PaycheckSheet';
import { TransactionSheet } from '../features/activity/TransactionSheet';
import { CategoriesSheet } from '../features/activity/CategoriesSheet';
import { ExportSheet } from '../features/insights/ExportSheet';
import { InstallPrompt } from '../features/install/InstallPrompt';
import { ToastProvider } from './Toast';

/**
 * Phone: one 480px column with the bottom tab bar and floating + button.
 * Desktop (lg, ≥1024px): sidebar on the left; content centred beside it, up to 1120px.
 * Each screen arranges itself in columns there (see components/Columns).
 */
export function AppShell() {
  const { pathname } = useLocation();
  return (
    <ToastProvider>
      <div className="lg:flex lg:min-h-dvh">
        <Sidebar />
        <div className="mx-auto min-h-dvh max-w-[480px] lg:mx-0 lg:max-w-none lg:min-w-0 lg:flex-1">
          <OfflineBanner />
          {/* Phone bottom padding clears the tab bar plus the + button floating above it. */}
          <main className="px-[var(--gutter)] pt-[max(24px,env(safe-area-inset-top))] pb-[calc(var(--tabbar-height)+var(--fab-size)+40px)] lg:px-[max(16px,3vw)] lg:pt-8 lg:pb-12">
            <div key={pathname} className="anim-screen flex w-full flex-col gap-5 lg:mx-auto lg:max-w-[1120px] lg:gap-6">
              <Outlet />
            </div>
          </main>
          <TabBar />
        </div>
      </div>
      <AddSheet />
      <GoalSheet />
      <IncomeSourceSheet />
      <PaycheckSheet />
      <TransactionSheet />
      <CategoriesSheet />
      <ExportSheet />
      <InstallPrompt />
    </ToastProvider>
  );
}
