import type { ColorProfile } from '@/lib/themes';
import type { ContinueReason } from '@/lib/services/progressService';

interface ContinueBannerProps {
  profile: ColorProfile;
  level: number;
  sublevel: string;
  sublevelName: string;
  reason: ContinueReason;
  onPlay: () => void;
}

/**
 * "Continue" strip from the redesigned home screen — shows the single
 * suggested next sublevel (see lib/services/progressService.computeContinueTarget)
 * and a Play button. Play is not wired to start a game yet (deferred to the
 * next pass); onPlay is a placeholder the caller can no-op for now.
 */
export default function ContinueBanner({ profile: p, level, sublevel, sublevelName, reason, onPlay }: ContinueBannerProps) {
  const title =
    reason === 'sequence_complete'
      ? `You've completed every sublevel! Revisit Level ${level}, sublevel ${sublevel} · ${sublevelName}`
      : `Level ${level}, sublevel ${sublevel} · ${sublevelName}`;

  return (
    <div
      style={{
        backgroundColor: p.homeSurfaceBackground,
        border: `1px solid ${p.homeBorder}`,
        borderRadius: '20px',
        padding: '16px 22px',
        marginBottom: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            color: p.homeAccentSolid,
            margin: 0,
            fontFamily: 'var(--font-nunito), sans-serif',
          }}
        >
          Continue
        </p>
        <p
          style={{
            fontFamily: 'var(--font-baloo-2), sans-serif',
            fontWeight: 700,
            fontSize: '17px',
            margin: '2px 0 0',
            color: p.homeInk,
          }}
        >
          {title}
        </p>
      </div>

      <button
        onClick={onPlay}
        style={{
          fontFamily: 'var(--font-baloo-2), sans-serif',
          fontWeight: 700,
          fontSize: '15px',
          color: '#ffffff',
          background: p.homeAccentGradient,
          border: 'none',
          padding: '12px 24px',
          borderRadius: '999px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Play →
      </button>
    </div>
  );
}
