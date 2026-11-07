import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** History state set by in-app links, so closing can pop history instead of pushing a new entry. */
const SHEET_STATE = { sheet: true } as const;

/**
 * Sheets are driven by a URL search param (e.g. `?add=expense`, `?goal=3`), so the phone's Back
 * button closes them and links can deep-open them over any screen.
 * `extras` are companion params (e.g. `goalId`) that are cleared along with the main one.
 */
export function useUrlSheet(param: string, extras: readonly string[] = []) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const value = params.get(param);

  // Closing can be requested twice before the URL updates (e.g. a delete closes the sheet, and the
  // edit view also closes when its record disappears). Two navigate(-1) calls would go back two
  // screens, so ignore repeats until the param actually changes.
  const closing = useRef(false);
  useEffect(() => {
    closing.current = false;
  }, [value]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if ((location.state as typeof SHEET_STATE | null)?.sheet) {
      navigate(-1);
    } else {
      // Opened from a pasted URL or a reload: drop the params in place.
      const next = new URLSearchParams(params);
      next.delete(param);
      extras.forEach((e) => next.delete(e));
      setParams(next, { replace: true });
    }
  }, [location.state, navigate, params, setParams, param, extras]);

  /** Swap the value without adding a history entry (e.g. switching tabs inside the sheet). */
  const replace = useCallback(
    (v: string) => {
      const next = new URLSearchParams(params);
      next.set(param, v);
      setParams(next, { replace: true, state: location.state });
    },
    [location.state, params, setParams, param],
  );

  return { value, params, close, replace };
}

/** Link props that open a sheet over the current screen. */
export function sheetLink(search: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]));
  return { to: { search: `?${qs}` }, state: SHEET_STATE };
}

/**
 * Like sheetLink, but keeps the current screen's own params (e.g. Activity's filter and search),
 * so the screen behind the sheet doesn't change while it's open.
 */
export function useSheetLink() {
  const [params] = useSearchParams();
  return useCallback(
    (search: Record<string, string | number>) => {
      const qs = new URLSearchParams(params);
      for (const [k, v] of Object.entries(search)) qs.set(k, String(v));
      return { to: { search: `?${qs}` }, state: SHEET_STATE };
    },
    [params],
  );
}
