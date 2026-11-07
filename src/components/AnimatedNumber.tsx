import { formatPeso, type FormatOptions } from '../lib/money';
import { useCountUp } from '../lib/useCountUp';

/**
 * A number that counts up to its value. Screen readers get the final value only (the rolling
 * digits are aria-hidden), so nothing is announced mid-animation.
 */
export function AnimatedNumber({ value, format = String }: { value: number; format?: (n: number) => string }) {
  const shown = useCountUp(value);
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

/**
 * Integer centavos, counted up and formatted as pesos. In-between frames show whole pesos only,
 * so centavos don't flicker; the final frame is the exact amount.
 */
export function AnimatedPeso({ value, ...opts }: { value: number } & FormatOptions) {
  return <AnimatedNumber value={value} format={(n) => formatPeso(n === value ? n : Math.round(n / 100) * 100, opts)} />;
}
