import type { ColorProfile } from '@/lib/themes';
import type { SublevelStatus } from '@/lib/services/progressService';

export interface LevelCardSublevel {
  key: string;
  name: string;
  status: SublevelStatus;
  /** New: cascading-unlock state from computeSublevelLockInfo. */
  unlocked: boolean;
  passed: boolean;
  bestScorePercent: number | null;
}

export interface LevelCardData {
  level: number;
  name: string;
  sublevels: LevelCardSublevel[];
}

interface LevelGridProps {
  profile: ColorProfile;
  levels: LevelCardData[];
  onSublevelClick: (level: number, sublevel: string) => void;
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * The "Choose a level" grid — 5 level cards, sublevels as chips. Locking is
 * now real: a sublevel chip with unlocked === false is visually distinct and
 * not clickable, regardless of its exposure `status`. This reverses the
 * prior "no locked/gray-out state" product decision — see progressService.ts's
 * computeSublevelLockInfo for how unlocked is derived.
 */
export default function LevelGrid({ profile: p, levels, onSublevelClick }: LevelGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '18px',
      }}
    >
      {levels.map((card) => (
        <LevelCard key={card.level} profile={p} card={card} onSublevelClick={onSublevelClick} />
      ))}
    </div>
  );
}

function LevelCard({
  profile: p,
  card,
  onSublevelClick,
}: {
  profile: ColorProfile;
  card: LevelCardData;
  onSublevelClick: (level: number, sublevel: string) => void;
}) {
  const accent = p.homeLevelPalette[(card.level - 1) as 0 | 1 | 2 | 3 | 4] ?? p.homeLevelPalette[0];
  const totalCount = card.sublevels.length;
  const passedCount = card.sublevels.filter((s) => s.passed).length;
  const isLevelComplete = totalCount > 0 && passedCount === totalCount;

  const statusText =
    totalCount === 0 ? 'No sublevels yet' : `${passedCount} of ${totalCount} sublevel${totalCount === 1 ? '' : 's'} passed`;

  return (
    <div
      style={{
        backgroundColor: p.homeSurfaceBackground,
        border: `1px solid ${p.homeBorder}`,
        borderRadius: '20px',
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-baloo-2), sans-serif',
            fontWeight: 800,
            fontSize: '18px',
            flexShrink: 0,
            backgroundColor: accent.bg,
            color: accent.accent,
          }}
        >
          {isLevelComplete ? '✓' : card.level}
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-baloo-2), sans-serif', fontWeight: 700, fontSize: '16px', margin: 0, color: accent.ink }}>
            Level {card.level}
            {card.name ? `: ${card.name}` : ''}
          </p>
          <p style={{ fontSize: '12px', color: p.homeInkSoft, margin: '2px 0 0' }}>{statusText}</p>
        </div>
      </div>

      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {card.sublevels.map((sub) => (
            <SublevelChip key={sub.key} profile={p} accent={accent} sub={sub} onClick={() => onSublevelClick(card.level, sub.key)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SublevelChip({
  profile: p,
  accent,
  sub,
  onClick,
}: {
  profile: ColorProfile;
  accent: { accent: string; bg: string; ink: string };
  sub: LevelCardSublevel;
  onClick: () => void;
}) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-baloo-2), sans-serif',
    fontWeight: 700,
    fontSize: '12px',
    padding: '8px 12px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none',
  };

  if (!sub.unlocked) {
    return (
      <button
        disabled
        title={`${sub.name} — complete the previous sublevel first`}
        style={{
          ...base,
          backgroundColor: p.homePanelBackground,
          border: `1px dashed ${p.homeBorder}`,
          color: p.homeInkSoft,
          opacity: 0.6,
          cursor: 'not-allowed',
        }}
      >
        <LockIcon />
        {sub.key}
      </button>
    );
  }

  let style: React.CSSProperties;
  if (sub.passed) {
    style = { ...base, background: p.homeUseGradientForActive ? p.homeAccentGradient : p.homeAccentSolid, color: '#ffffff', cursor: 'pointer' };
  } else if (sub.status === 'in_progress') {
    style = { ...base, backgroundColor: p.homeSurfaceBackground, border: `2px solid ${accent.accent}`, color: accent.ink, padding: '6px 10px', cursor: 'pointer' };
  } else if (sub.status === 'complete') {
    // Fully attempted but didn't hit 80% — unlocked (a prior pass elsewhere
    // isn't required to retry), but visually flagged as needing another try.
    style = { ...base, backgroundColor: p.homeSurfaceBackground, border: `2px solid ${p.clearAnswerButtonColor}`, color: p.clearAnswerButtonColor, cursor: 'pointer' };
  } else {
    style = { ...base, backgroundColor: p.homePanelBackground, border: `1px solid ${p.homeBorder}`, color: p.homeInkSoft, cursor: 'pointer' };
  }

  return (
    <button onClick={onClick} style={style} title={sub.bestScorePercent !== null ? `${sub.name} — best score ${sub.bestScorePercent}%` : sub.name}>
      {sub.key}
      {sub.passed && ' ✓'}
    </button>
  );
}