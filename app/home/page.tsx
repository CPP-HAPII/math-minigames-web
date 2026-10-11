'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/userStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes, type ColorProfile } from '@/lib/themes';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { fetchStudentQuestionRows, type QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import { computeLockedContinueTarget, computeSublevelLockInfo } from '@/lib/services/progressService';
import { LEVEL_MAP, SUBLEVEL_MAP } from '@/lib/levelMap';
import ContinueBanner from '@/components/home/ContinueBanner';
import LevelGrid, { type LevelCardData } from '@/components/home/LevelGrid';
import type { AssistLevel, AnyGameData } from '@/lib/types';

// ── Static selector data ──────────────────────────────────────────────────────

const ASSIST_LEVELS: { label: string; key: AssistLevel; description: string }[] = [
  {
    label: 'Novice',
    key: 'novice',
    description: 'Automatic Spanish translations and question read-aloud support where available.',
  },
  {
    label: 'Intermediate',
    key: 'intermediate',
    description: 'Show Spanish translations when you choose Translate.',
  },
  {
    label: 'Advanced',
    key: 'advanced',
    description: 'Hover over supported words for translations, with fewer assist tools shown.',
  },
];

const LEVEL_NUMBERS = [1, 2, 3, 4, 5] as const;

function HomeSettings({ profile: p, hydrated }: { profile: ColorProfile; hydrated: boolean }) {
  const level = useAssistStore((s) => s.level);
  const setLevel = useAssistStore((s) => s.setLevel);
  const themeIndex = useThemeStore((s) => s.themeIndex);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeLevel = hydrated ? level : 'novice';
  const activeThemeIndex = hydrated ? themeIndex : 0;

  function openSettings() {
    if (!dialogRef.current || dialogRef.current.open) return;
    // Native modal behavior keeps keyboard focus inside and handles Escape.
    dialogRef.current.showModal();
    setOpen(true);
  }

  function closeSettings() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="settings-trigger"
        type="button"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="home-settings"
        onClick={openSettings}
        style={{ color: p.homeWelcomeColor || p.homeInk }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M9.7 4.3 10.2 2h3.6l.5 2.3 1.8 1 2.3-.7 1.8 3.1-1.7 1.6v2.1l1.7 1.6-1.8 3.1-2.3-.7-1.8 1-.5 2.3h-3.6l-.5-2.3-1.8-1-2.3.7L3.8 13l1.7-1.6V9.3L3.8 7.7l1.8-3.1 2.3.7 1.8-1Z" transform="translate(0 1.65)" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        id="home-settings"
        className="settings-dialog"
        aria-labelledby="home-settings-title"
        aria-describedby="home-settings-description"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
            closeSettings();
          }
        }}
        style={{
          '--settings-surface': p.homeSurfaceBackground,
          '--settings-panel': p.homePanelBackground,
          '--settings-border': p.homeBorder,
          '--settings-ink': p.homeInk,
          '--settings-muted': p.homeInkSoft,
          '--settings-accent': p.homeAccentSolid,
        } as CSSProperties}
      >
        <div className="settings-heading">
          <h2 id="home-settings-title">Settings</h2>
          <button type="button" className="settings-close" aria-label="Close settings" onClick={closeSettings} autoFocus>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p id="home-settings-description" className="settings-description">Choose the support and colors that work for you.</p>

        <fieldset className="settings-group">
          <legend>Language Assist</legend>
          <p className="settings-help">These modes change language support during games.</p>
          <div className="assist-options">
            {ASSIST_LEVELS.map(({ label, key, description }) => (
              <label key={key} className="settings-option assist-option" data-selected={activeLevel === key}>
                <input
                  type="radio"
                  name="home-assist-mode"
                  value={key}
                  checked={activeLevel === key}
                  onChange={() => setLevel(key)}
                  aria-labelledby={`assist-label-${key}`}
                  aria-describedby={`assist-description-${key}`}
                />
                <span>
                  <span id={`assist-label-${key}`} className="option-title">{label}</span>
                  <span id={`assist-description-${key}`} className="option-description">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-group palette-group">
          <legend>Color palette</legend>
          <p className="settings-help">Applies to the level overview and games.</p>
          <div className="palette-options">
            {themes.map((theme, index) => (
              <label key={theme.idKey} className="settings-option palette-option" data-selected={activeThemeIndex === index}>
                <span className="palette-label">
                  <input type="radio" name="home-color-palette" value={index} checked={activeThemeIndex === index} onChange={() => setTheme(index)} />
                  <span className="option-title">{theme.homeLabel}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="settings-footer">
          <p className="settings-help">Your choices are saved automatically.</p>
          <button type="button" className="settings-done" onClick={closeSettings} style={{ background: p.homeAccentGradient, color: p.contrastTextColor }}>Done</button>
        </div>
      </dialog>

      <style jsx>{`
        .settings-trigger, .settings-close {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .settings-trigger { justify-self: end; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }
        .settings-dialog {
          position: fixed;
          inset: 100px clamp(12px, 3vw, 34px) auto auto;
          box-sizing: border-box;
          width: min(440px, calc(100vw - 24px));
          max-width: none;
          max-height: calc(100dvh - 116px);
          margin: 0;
          padding: 24px;
          overflow-y: auto;
          overscroll-behavior: contain;
          border: 1px solid var(--settings-border);
          border-radius: 20px;
          background: var(--settings-surface);
          color: var(--settings-ink);
          font-family: var(--font-nunito), sans-serif;
          box-shadow: none;
        }
        .settings-dialog::backdrop {
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .settings-heading, .settings-footer, .palette-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        h2 { font-size: 26px; font-weight: 800; margin: 0; }
        .settings-description, .settings-help {
          color: var(--settings-muted);
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        }
        .settings-description { margin: 4px 0 24px; }
        .settings-group { border: 0; margin: 0; padding: 0; min-width: 0; }
        legend { padding: 0; margin-bottom: 6px; font-size: 18px; font-weight: 800; }
        .assist-options { display: grid; gap: 8px; margin-top: 12px; }
        .settings-option {
          box-sizing: border-box;
          min-width: 0;
          padding: 12px;
          border: 2px solid var(--settings-border);
          border-radius: 12px;
          background: var(--settings-surface);
          cursor: pointer;
        }
        .settings-option[data-selected='true'] {
          border-color: var(--settings-accent);
          background: var(--settings-panel);
        }
        .assist-option { display: flex; align-items: flex-start; gap: 12px; }
        input {
          width: 18px;
          height: 18px;
          margin: 3px 0 0;
          flex-shrink: 0;
          accent-color: var(--settings-accent);
          cursor: pointer;
        }
        .option-title { display: block; font-size: 15px; font-weight: 800; line-height: 1.4; }
        .option-description { display: block; margin-top: 3px; color: var(--settings-muted); font-size: 13px; line-height: 1.45; }
        .palette-group { margin-top: 24px; }
        .palette-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .palette-option { display: flex; align-items: center; min-height: 44px; padding: 10px 8px; }
        .palette-label { justify-content: flex-start; align-items: flex-start; gap: 6px; }
        .palette-label .option-title { font-size: 13px; }
        .palette-label input { width: 16px; height: 16px; margin-top: 1px; }
        .settings-footer { border-top: 1px solid var(--settings-border); padding-top: 18px; margin-top: 24px; }
        .settings-footer p { font-size: 12px; }
        .settings-done { border: 0; border-radius: 999px; padding: 12px 24px; min-height: 44px; font: inherit; font-weight: 800; cursor: pointer; }
        @media (max-width: 380px) {
          .settings-dialog { padding: 18px; }
          .palette-options { grid-template-columns: 1fr; }
        }
        @media (max-height: 640px) {
          .settings-dialog { top: 12px; max-height: calc(100dvh - 24px); }
        }
      `}</style>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const userId     = useUserStore((s) => s.userId);
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
  const sublevelLockInfo = useMemo(
  () => (progressReady ? computeSublevelLockInfo(rows, bank) : []),
  [progressReady, rows, bank],
);
  const continueTarget = useMemo(
    () => (progressReady ? computeLockedContinueTarget(rows, bank) : null),
    [progressReady, rows, bank],
  );

const levelCards: LevelCardData[] = useMemo(
  () =>
    LEVEL_NUMBERS.map((levelNum) => ({
      level: levelNum,
      name: LEVEL_MAP[levelNum] ?? '',
      sublevels: sublevelLockInfo
        .filter((s) => s.level === levelNum)
        .map((s) => ({
          key: s.sublevel,
          name: SUBLEVEL_MAP[s.sublevel] ?? '',
          status: s.status,
          unlocked: s.unlocked,
          passed: s.passed,
          bestScorePercent: s.bestScorePercent,
        })),
    })),
  [sublevelLockInfo],
);

  const router = useRouter();

  function goToPlay(targetLevel: number, targetSublevel: string) {
    router.push(`/play?level=${targetLevel}&sublevel=${encodeURIComponent(targetSublevel)}`);
  }

  function handleSublevelClick(clickedLevel: number, clickedSublevel: string) {
    const target = sublevelLockInfo.find((s) => s.level === clickedLevel && s.sublevel === clickedSublevel);
    // Defense in depth — LevelGrid already disables the button when locked, but
    // a stray click event or future caller shouldn't be able to bypass the lock.
    if (target && !target.unlocked) return;
    goToPlay(clickedLevel, clickedSublevel);
}

  function handlePlay() {
    if (continueTarget && continueTarget.level !== null && continueTarget.sublevel !== null) {
      goToPlay(continueTarget.level, continueTarget.sublevel);
    }
  }

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
          padding: '22px clamp(16px, 3vw, 34px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 44px',
          alignItems: 'center',
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

        <HomeSettings profile={p} hydrated={hydrated} />
      </header>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '28px 30px 60px' }}>
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
