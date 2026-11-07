import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, strokeWidth = 2, children, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></Icon>
);
export const MoneyIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></Icon>
);
export const ActivityIcon = (p: IconProps) => (
  <Icon {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>
);
export const GoalsIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Icon>
);
export const InsightsIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14M5 12l7 7 7-7" /></Icon>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
);
export const AllocateIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3v9l6 6" /><circle cx="12" cy="12" r="9" /></Icon>
);
export const TargetIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></Icon>
);
