import { useCallback, useSyncExternalStore } from 'react';

/** Matches Tailwind's `lg` breakpoint, where the desktop layout (sidebar, card grid) kicks in. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
