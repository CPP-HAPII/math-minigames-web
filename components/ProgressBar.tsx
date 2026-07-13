import type { ColorProfile } from '@/lib/themes';

interface ProgressBarProps {
  /** 0–1, matching sessionStore's `progress` field. */
  progress: number;
  profile: ColorProfile;
}

/**
 * Ported from ProgressBar in progress_bar.dart (LinearPercentIndicator with a
 * "{percent}%" label centered in the bar), wired to real series progress —
 * sessionStore.progress, set by submitAnswer() as currentIndex/questions.length
 * — not a decorative/static fill.
 */
export default function ProgressBar({ progress, profile: p }: ProgressBarProps) {
  const percent = Math.round(progress * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        height: '1.75rem',
        borderRadius: '1rem',
        backgroundColor: p.disabledButtonColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${percent}%`,
          backgroundColor: p.checkAnswerButtonColor,
          transition: 'width 500ms ease-out',
        }}
      />
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: p.contrastTextColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        {percent}%
      </div>
    </div>
  );
}
