// Inline SVG icons for the play screen (no icon package). Everything draws in
// currentColor, so each icon takes the colour of whatever it sits in.

interface IconProps {
  size?: number;
}

const base = (size: number) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  }) as const;

export function ArrowDownIcon({ size = 30 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2}>
      <path d="M12 4v15" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}

export function RefreshIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.6" />
      <path d="M20 4.5V11h-6.5" />
    </svg>
  );
}

export function CheckIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={3}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ChevronIcon({ size = 22, up = false }: IconProps & { up?: boolean }) {
  return (
    <svg {...base(size)} strokeWidth={2.6}>
      <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

export function GlobeIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.9}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

export function CalculatorIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <rect x="8" y="6" width="8" height="3.2" rx="0.8" />
      <path d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 18.2h.01M12 18.2h.01M15.5 18.2h.01" strokeWidth={2.6} />
    </svg>
  );
}

export function MicIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function StopIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" strokeWidth={1}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function PlayIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" strokeWidth={1}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export function PauseIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" strokeWidth={1}>
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
