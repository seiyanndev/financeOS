/**
 * The launch splash lives in index.html so it shows before any JavaScript runs.
 * Once the app has rendered, this fades it out — but not before the logo intro (~1.4 s from
 * page start) has finished, so it never cuts off mid-animation. It plays once per session:
 * every launch of the installed app, but not on reloads within the same tab.
 */
const INTRO_MS = 1450;
const KEY = 'finance-os-splash';

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode: it'll just play again next load */
  }
  if (getComputedStyle(el).display === 'none') {
    el.remove();
    return;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = reduced ? 0 : Math.max(0, INTRO_MS - performance.now());
  window.setTimeout(() => {
    el.classList.add('splash-out');
    const remove = () => el.remove();
    el.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 600); // in case transitionend never fires
  }, wait);
}
