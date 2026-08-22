'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/lib/stores/userStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { fetchStudentQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { computeContinueTarget, computeSublevelProgress } from '@/lib/services/progressService';
import { LEVEL_MAP, SUBLEVEL_MAP } from '@/lib/levelMap';
import ContinueBanner from '@/components/home/ContinueBanner';
import LevelGrid, { type LevelCardData } from '@/components/home/LevelGrid';
import type { AssistLevel, AnyGameData } from '@/lib/types';

// ── Static selector data ──────────────────────────────────────────────────────

const ASSIST_LEVELS: { label: string; key: AssistLevel }[] = [
  { label: 'Novice',       key: 'novice' },
  { label: 'Intermediate', key: 'intermediate' },
  { label: 'Advanced',     key: 'advanced' },
];

const LEVEL_NUMBERS = [1, 2, 3, 4, 5] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const userId     = useUserStore((s) => s.userId);
  const level      = useAssistStore((s) => s.level);
  const setLevel   = useAssistStore((s) => s.setLevel);
  const themeIndex = useThemeStore((s) => s.themeIndex);
  const setTheme   = useThemeStore((s) => s.setTheme);
  const profile    = useThemeStore(selectActiveProfile);

  // Hydration guard — Zustand persist stores read localStorage on client only.
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  // ── Question bank (for level/sublevel lookups) ──────────────────────────────
  const isLoaded        = useGameDataStore((s) => s.isLoaded);
  const initBanks       = useGameDataStore((s) => s.initBanks);
  const jumbleBank      = useGameDataStore((s) => s.jumbleBank);
  const playbackBank    = useGameDataStore((s) => s.playbackBank);
  const readAloudBank   = useGameDataStore((s) => s.readAloudBank);
  const typingBank      = useGameDataStore((s) => s.typingBank);
  const fillBlanksBank  = useGameDataStore((s) => s.fillBlanksBank);

  useEffect(() => {
    initBanks();
  }, [initBanks]);

  // Combines the 5 per-type banks (rather than the per-difficulty banks, which
  // exclude 'random'-difficulty questions) into the full parsed question set.
  const bank: AnyGameData[] = useMemo(
    () => [...jumbleBank, ...playbackBank, ...readAloudBank, ...typingBank, ...fillBlanksBank],
    [jumbleBank, playbackBank, readAloudBank, typingBank, fillBlanksBank],
  );

  // ── This student's attempt history ──────────────────────────────────────────
  const [rows, setRows] = useState<QuestionAttemptRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchStudentQuestionRows(userId).then((fetched) => {
      if (cancelled) return;
      setRows(fetched);
      setRowsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Progress + Continue target ──────────────────────────────────────────────
  const progressReady = isLoaded && rowsLoaded;
  const sublevelProgress = useMemo(
    () => (progressReady ? computeSublevelProgress(rows, bank) : []),
    [progressReady, rows, bank],
  );
  const continueTarget = useMemo(
    () => (progressReady ? computeContinueTarget(rows, bank) : null),
    [progressReady, rows, bank],
  );

  const levelCards: LevelCardData[] = useMemo(
    () =>
      LEVEL_NUMBERS.map((levelNum) => ({
        level: levelNum,
        name: LEVEL_MAP[levelNum] ?? '',
        sublevels: sublevelProgress
          .filter((s) => s.level === levelNum)
          .map((s) => ({ key: s.sublevel, name: SUBLEVEL_MAP[s.sublevel] ?? '', status: s.status })),
      })),
    [sublevelProgress],
  );

  // Sublevel clicks and Play are intentionally inert this pass — wiring them
  // to actually start a game is deferred to the next prompt.
  function handleSublevelClick(clickedLevel: number, clickedSublevel: string) {
    void clickedLevel;
    void clickedSublevel;
  }

  function handlePlay() {}

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        background: p.homePageBackground,
        minHeight: '100vh',
        color: p.homeInk,
        fontFamily: 'var(--font-nunito), sans-serif',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          background: p.homeHeaderBackground,
          borderBottom: p.homeHeaderBorderBottom || undefined,
          padding: '22px 34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <p
          style={{
            fontFamily: p.homeWelcomeFont,
            fontWeight: p.homeWelcomeGradient ? 700 : 800,
            fontSize: p.homeWelcomeGradient ? '32px' : '26px',
            margin: 0,
            color: p.homeWelcomeGradient ? 'transparent' : p.homeWelcomeColor,
            background: p.homeWelcomeGradient || undefined,
            backgroundClip: p.homeWelcomeGradient ? 'text' : undefined,
            WebkitBackgroundClip: p.homeWelcomeGradient ? 'text' : undefined,
          }}
        >
          Welcome, {hydrated ? (userId || 'Student') : '…'}!
        </p>

        {/* Theme switcher */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {themes.map((themeOption, i) => {
            const isActive = i === themeIndex;
            return (
              <button
                key={themeOption.idKey}
                onClick={() => setTheme(i)}
                aria-label={`Switch to ${themeOption.homeLabel} theme`}
                style={{
                  fontFamily: 'var(--font-nunito), sans-serif',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '9px 16px',
                  borderRadius: '999px',
                  border: isActive ? '2px solid transparent' : `2px solid ${p.homeThemeButtonInactiveBorder}`,
                  background: isActive ? p.homeThemeButtonActiveBackground : p.homeThemeButtonInactiveBackground,
                  color: isActive ? p.homeThemeButtonActiveColor : p.homeThemeButtonInactiveColor,
                  cursor: 'pointer',
                }}
              >
                {themeOption.homeLabel}
              </button>
            );
          })}
        </div>
      </header>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '28px 30px 60px' }}>
        {/* ── Language Assist ──────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: p.homePanelBackground,
            borderRadius: '20px',
            padding: '18px 20px',
            marginBottom: '30px',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-baloo-2), sans-serif', fontSize: '15px', margin: '0 0 12px', color: p.homeInk }}>
            Language Assist
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ASSIST_LEVELS.map(({ label, key }) => {
              const active = level === key;
              return (
                <button
                  key={key}
                  onClick={() => setLevel(key)}
                  style={{
                    fontFamily: 'var(--font-nunito), sans-serif',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '10px 16px',
                    borderRadius: '999px',
                    border: active ? 'none' : `1px solid ${p.homeBorder}`,
                    background: active ? (p.homeUseGradientForActive ? p.homeAccentGradient : p.homeAccentSolid) : p.homeSurfaceBackground,
                    color: active ? '#ffffff' : p.homeInkSoft,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Continue ─────────────────────────────────────────────────── */}
        {continueTarget && continueTarget.level !== null && continueTarget.sublevel !== null && (
          <ContinueBanner
            profile={p}
            level={continueTarget.level}
            sublevel={continueTarget.sublevel}
            sublevelName={SUBLEVEL_MAP[continueTarget.sublevel] ?? ''}
            reason={continueTarget.reason}
            onPlay={handlePlay}
          />
        )}

        {/* ── Level grid ───────────────────────────────────────────────── */}
        <p style={{ fontFamily: 'var(--font-baloo-2), sans-serif', fontWeight: 700, fontSize: '20px', margin: '0 0 16px' }}>
          Choose a level
        </p>
        <LevelGrid profile={p} levels={levelCards} onSublevelClick={handleSublevelClick} />
      </div>
    </main>
  );
}
