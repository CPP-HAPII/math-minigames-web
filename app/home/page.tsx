'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/userStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { SKILL_MAP } from '@/lib/skillMap';
import type { AssistLevel, Difficulty } from '@/lib/types';

// ── Static selector data ──────────────────────────────────────────────────────

const DIFFICULTIES: { label: string; key: Difficulty }[] = [
  { label: 'Easy',   key: 'easy' },
  { label: 'Medium', key: 'intermediate' }, // UI "Medium" → data key "intermediate"
  { label: 'Hard',   key: 'hard' },
  { label: 'Random', key: 'random' },
];

const ASSIST_LEVELS: { label: string; key: AssistLevel }[] = [
  { label: 'Novice',       key: 'novice' },
  { label: 'Intermediate', key: 'intermediate' },
  { label: 'Advanced',     key: 'advanced' },
];

const THEME_LABELS = ['Green', 'Blue', 'Light', 'Dark'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const userId     = useUserStore((s) => s.userId);
  const level      = useAssistStore((s) => s.level);
  const setLevel   = useAssistStore((s) => s.setLevel);
  const themeIndex = useThemeStore((s) => s.themeIndex);
  const setTheme   = useThemeStore((s) => s.setTheme);
  const profile    = useThemeStore(selectActiveProfile);

  // Difficulty is session-local; not persisted (matches Flutter's local state).
  const [difficulty, setDifficulty] = useState<Difficulty>('random');

  // Hydration guard — Zustand persist stores read localStorage on client only.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const router = useRouter();

  function navigateToPlay(category: string) {
    const params = new URLSearchParams({ difficulty, category });
    router.push(`/play?${params.toString()}`);
  }

  // Use default green profile during SSR to avoid mismatch.
  const p = hydrated ? profile : themes[0];

  // ── Shared button styles ────────────────────────────────────────────────────

  const selectorBtn = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? p.buttonColor : p.backgroundColor,
    color:           p.textColor,
    border:          `1.5px solid ${p.textColor}22`,
    borderRadius:    '0.5rem',
    padding:         '0.5rem 1.1rem',
    fontWeight:      active ? 700 : 400,
    cursor:          'pointer',
    fontSize:        '0.95rem',
    transition:      'background-color 0.15s',
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main style={{ backgroundColor: p.backgroundColor, minHeight: '100vh', color: p.textColor }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: p.headerColor,
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: p.contrastTextColor, margin: 0 }}>
          Welcome, {hydrated ? (userId || 'Student') : '…'}!
        </h1>

        {/* Theme switcher */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {THEME_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTheme(i)}
              aria-label={`Switch to ${label} theme`}
              style={{
                backgroundColor: themes[i].buttonColor,
                color:           themes[i].textColor,
                border:          i === themeIndex
                  ? `2.5px solid ${p.contrastTextColor}`
                  : '2.5px solid transparent',
                borderRadius: '0.5rem',
                padding:      '0.3rem 0.85rem',
                fontWeight:   i === themeIndex ? 700 : 400,
                cursor:       'pointer',
                fontSize:     '0.85rem',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Selector panels ─────────────────────────────────────────────── */}
      <section
        style={{
          display:   'flex',
          flexWrap:  'wrap',
          gap:       '1.25rem',
          padding:   '1.5rem',
        }}
      >
        {/* Difficulty */}
        <div
          style={{
            backgroundColor: p.headerColor,
            borderRadius:    '1rem',
            padding:         '1rem 1.25rem',
            flex:            '1 1 260px',
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.7rem', color: p.contrastTextColor }}>
            Difficulty
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {DIFFICULTIES.map(({ label, key }) => (
              <button key={key} onClick={() => setDifficulty(key)} style={selectorBtn(difficulty === key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language Assist */}
        <div
          style={{
            backgroundColor: p.headerColor,
            borderRadius:    '1rem',
            padding:         '1rem 1.25rem',
            flex:            '1 1 260px',
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.7rem', color: p.contrastTextColor }}>
            Language Assist
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ASSIST_LEVELS.map(({ label, key }) => (
              <button key={key} onClick={() => setLevel(key)} style={selectorBtn(level === key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Skill category grid ─────────────────────────────────────────── */}
      <section style={{ padding: '0 1.5rem 2.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '1rem', color: p.textColor }}>
          Choose a Category
        </h2>
        <div
          style={{
            display:               'grid',
            gridTemplateColumns:   'repeat(auto-fill, minmax(195px, 1fr))',
            gap:                   '0.7rem',
          }}
        >
          {Object.entries(SKILL_MAP).map(([key, label]) => (
            <button
              key={key}
              onClick={() => navigateToPlay(key)}
              style={{
                backgroundColor: p.buttonColor,
                color:           p.textColor,
                border:          'none',
                borderRadius:    '0.85rem',
                padding:         '0.95rem 1rem',
                textAlign:       'left',
                cursor:          'pointer',
                fontWeight:      500,
                fontSize:        '0.875rem',
                lineHeight:      1.35,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
