/** "GrabFood" → "GF", "Electricity bill" → "EB", "Part-Time Job" → "PT". */
export function initials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  const word = words[0] ?? '?';
  const caps = word.match(/[A-Z]/g);
  if (caps && caps.length >= 2) return caps.slice(0, 2).join('');
  return word.slice(0, 2).toUpperCase();
}

/** Foreign minor units → "300" or "300.50". Integer maths, matching formatPeso. */
export function formatForeign(minor: number): string {
  const whole = Math.trunc(minor / 100);
  const frac = minor % 100;
  return whole.toLocaleString('en-US') + (frac ? '.' + String(frac).padStart(2, '0') : '');
}
