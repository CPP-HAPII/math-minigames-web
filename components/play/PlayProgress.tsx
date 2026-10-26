'use client';

import { usePlayTokens } from '@/lib/usePlayTokens';

interface PlayProgressProps {
  /** "Question 1 / 8", or "Retry 1 / 2" during the second pass. */
  label: string;
  /** 0 to 1. */
  progress: number;
  /** Short chip shown after the label while the missed questions are being retried. */
  retryNote?: string;
}

/** The strip under the header: question count on the left, progress bar with its percentage on the right. */
export default function PlayProgress({ label, progress, retryNote }: PlayProgressProps) {
  const t = usePlayTokens();
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 16,
        padding: '10px 20px',
        fontFamily: t.bodyFont,
        color: t.progressInk,
      }}
    >
      <span style={{ flex: 'none', fontFamily: t.displayFont, fontWeight: 600, fontSize: '1.3rem', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {retryNote && (
        <span
          style={{
            flex: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: t.blockBg,
            color: t.blockInk,
            border: `1px solid ${t.blockBorder}`,
            whiteSpace: 'nowrap',
          }}
        >
          {retryNote}
        </span>
      )}

      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          position: 'relative',
          flex: 1,
          height: 28,
          borderRadius: 999,
          background: t.progressTrack,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${Math.max(pct, 4)}%`,
            background: t.progressFill,
            borderRadius: 999,
            transition: 'width 300ms ease',
          }}
        />
        <span
          style={{
            position: 'relative',
            display: 'block',
            textAlign: 'center',
            lineHeight: '28px',
            fontWeight: 700,
            fontSize: '1.05rem',
          }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}
