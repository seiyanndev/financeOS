/**
 * Theme choice is a per-device convenience, so it lives in localStorage (read synchronously by an
 * inline script in index.html before first paint, which avoids a flash of the wrong theme).
 * 'system' means no data-theme attribute: tokens.css then follows prefers-color-scheme.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'finance-os-theme';
// Match --bg in tokens.css, for the browser/status bar colour.
const BAR = { light: '#F3F5F9', dark: '#0D1117' } as const;

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* storage blocked: still apply for this session */
  }
  applyTheme(choice);
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);

  // The two media-scoped theme-color metas in index.html handle 'system'; a forced theme overrides both.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const media = m.getAttribute('media') ?? '';
    const systemValue = media.includes('dark') ? BAR.dark : BAR.light;
    m.content = choice === 'system' ? systemValue : BAR[choice];
  });
}
