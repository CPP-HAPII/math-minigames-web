'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { SKILL_MAP } from '@/lib/skillMap';
import { themes } from '@/lib/themes';

export default function PlayContent() {
  const searchParams = useSearchParams();
  const difficulty   = searchParams.get('difficulty') ?? 'random';
  const category     = searchParams.get('category')   ?? '';
  const categoryLabel = category ? (SKILL_MAP[category] ?? category) : '(none)';

  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const p = hydrated ? profile : themes[0];
  const router = useRouter();

  return (
    <main
      style={{
        minHeight:      '100vh',
        backgroundColor: p.backgroundColor,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '0.75rem',
        padding:         '2rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: p.textColor }}>
        Play — Stage 9 placeholder
      </h1>
      <p style={{ color: p.textColor, fontSize: '1.1rem' }}>
        Difficulty: <strong>{difficulty}</strong>
      </p>
      <p style={{ color: p.textColor, fontSize: '1.1rem' }}>
        Category: <strong>{categoryLabel}</strong>
      </p>
      <button
        onClick={() => router.back()}
        style={{
          marginTop:       '1.5rem',
          backgroundColor: p.buttonColor,
          color:           p.textColor,
          border:          'none',
          borderRadius:    '0.75rem',
          padding:         '0.65rem 1.5rem',
          fontWeight:      600,
          cursor:          'pointer',
          fontSize:        '1rem',
        }}
      >
        ← Back
      </button>
    </main>
  );
}
