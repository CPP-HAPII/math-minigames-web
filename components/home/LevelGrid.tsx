import type { ColorProfile } from '@/lib/themes';
import type { SublevelStatus } from '@/lib/services/progressService';

export interface LevelCardSublevel {
  key: string;
  name: string;
  status: SublevelStatus;
}

export interface LevelCardData {
  level: number;
  name: string;
  sublevels: LevelCardSublevel[];
}

interface LevelGridProps {
  profile: ColorProfile;
  levels: LevelCardData[];
  /** Wiring sublevel clicks to actually start a game is deferred to the next pass. */
  onSublevelClick: (level: number, sublevel: string) => void;
}

/**
 * The redesigned "Choose a level" grid — 5 level cards, each showing its
 * sublevels as chips. There is NO locked/gray-out state: every sublevel is
 * always clickable regardless of completion elsewhere (per product decision —
 * students can jump ahead to any level/sublevel).
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
  const completeCount = card.sublevels.filter((s) => s.status === 'complete').length;
  const isLevelComplete = totalCount > 0 && completeCount === totalCount;

  const statusText =
    totalCount === 0 ? 'No sublevels yet' : `${completeCount} of ${totalCount} sublevel${totalCount === 1 ? '' : 's'} complete`;

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
    cursor: 'pointer',
  };

  let style: React.CSSProperties;
  if (sub.status === 'complete') {
    style = { ...base, background: p.homeUseGradientForActive ? p.homeAccentGradient : p.homeAccentSolid, color: '#ffffff' };
  } else if (sub.status === 'in_progress') {
    style = { ...base, backgroundColor: p.homeSurfaceBackground, border: `2px solid ${accent.accent}`, color: accent.ink, padding: '6px 10px' };
  } else {
    // 'not_started' — a plain, fully-clickable chip. No lock icon, no dimming:
    // there is no locking in this data model, so this must not read as disabled.
    style = { ...base, backgroundColor: p.homePanelBackground, border: `1px solid ${p.homeBorder}`, color: p.homeInkSoft };
  }

  return (
    <button onClick={onClick} style={style} title={sub.name}>
      {sub.key}
      {sub.status === 'complete' && ' ✓'}
    </button>
  );
}
