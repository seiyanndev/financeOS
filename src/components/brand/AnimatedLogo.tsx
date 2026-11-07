import { useState } from "react";
import "./AnimatedLogo.css";

type Variant = "intro" | "loader" | "static";

interface AnimatedLogoProps {
  /** Width and height in px. Default 96. */
  size?: number;
  /** intro = plays once on mount (splash screen), loader = bars loop (loading states), static = no motion. */
  variant?: Variant;
  /** Replay the intro when the logo is clicked. Only applies to the intro variant. */
  replayOnClick?: boolean;
  className?: string;
  label?: string;
}

export function AnimatedLogo({
  size = 96,
  variant = "intro",
  replayOnClick = false,
  className = "",
  label = variant === "loader" ? "Loading" : "Finance OS",
}: AnimatedLogoProps) {
  // Changing the key remounts the SVG, which restarts the CSS animation.
  const [playKey, setPlayKey] = useState(0);
  const canReplay = replayOnClick && variant === "intro";

  return (
    <svg
      key={playKey}
      className={`fos-logo fos-logo--${variant} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      onClick={canReplay ? () => setPlayKey((k) => k + 1) : undefined}
      style={canReplay ? { cursor: "pointer" } : undefined}
    >
      <rect className="fos-tile" width="512" height="512" rx="138" fill="#0532D4" />
      <path
        className="fos-arm fos-arm-top"
        fill="#FFFFFF"
        d="M210.5 94.3 H422 Q426.8 94.3 424.9 99 L413.9 132.5 Q401.9 166 361.3 168.4 H201 Q157.9 169.9 105.3 248.8 L124.4 155.5 Q136.4 97.1 210.5 94.3 Z"
      />
      <path
        className="fos-arm fos-arm-mid"
        fill="#FFFFFF"
        d="M201 201 H378 L357.9 234.5 Q335 270.4 297.6 272.3 H201 L173.2 357.4 Q160.3 390.9 126.8 392.4 H82.3 L99.5 279.9 Q114.8 205.8 201 201 Z"
      />
      <rect className="fos-bar fos-bar-1" x="219.2" y="327.8" width="49.8" height="63.6" rx="15" fill="#86EDB4" />
      <rect className="fos-bar fos-bar-2" x="281.4" y="299.1" width="49.8" height="92.3" rx="15" fill="#FFAE73" />
      <rect className="fos-bar fos-bar-3" x="343.6" y="270.8" width="48.8" height="120.6" rx="15" fill="#FFFFFF" />
    </svg>
  );
}

export default AnimatedLogo;
