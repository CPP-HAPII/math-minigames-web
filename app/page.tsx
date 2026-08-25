'use client';

// Login page — mirrors login_page.dart.
// No passwords; userId is a 3-digit numeric string, matching Flutter's validator.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/userStore';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';
import ThemeSwitcher from '@/components/ThemeSwitcher';

function validate(value: string): string {
  if (!value.trim()) return 'Please enter your Student ID.';
  if (!/^\d{3}$/.test(value)) return 'Student ID must be exactly 3 digits.';
  return '';
}

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const setStoreUserId = useUserStore((s) => s.setUserId);

  // Same persisted theme the home/play screens read — picking a theme on the
  // home page carries back here (and to the next student's first visit,
  // until someone changes it again), so this page can't stay hardcoded green.
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const msg = validate(userId);
    if (msg) {
      setError(msg);
      return;
    }
    setStoreUserId(userId);
    router.push('/home');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: p.homePageBackground,
        fontFamily: 'var(--font-nunito), sans-serif',
      }}
    >
      {/* ── Header — same gradient/border treatment as the home screen header ── */}
      <header
        style={{
          background: p.homeHeaderBackground,
          borderBottom: p.homeHeaderBorderBottom || undefined,
          padding: '22px 34px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
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
          Math Minigames
        </p>
        <ThemeSwitcher label="Pick a color!" />
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div
          className="w-full max-w-sm"
          style={{
            backgroundColor: p.homeSurfaceBackground,
            border: `1px solid ${p.homeBorder}`,
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-baloo-2), sans-serif',
              fontWeight: 700,
              fontSize: '26px',
              textAlign: 'center',
              margin: '0 0 4px',
              color: p.homeInk,
            }}
          >
            Welcome!
          </h1>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', margin: '0 0 28px', color: p.homeInkSoft }}>
            Enter your Student ID to begin
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="userId"
              style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px', color: p.homeInk }}
            >
              Student ID (3 digits)
            </label>

            <input
              id="userId"
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. 123"
              className="w-full outline-none transition-colors"
              style={{
                boxSizing: 'border-box',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '1.25rem',
                marginBottom: '4px',
                border: `2px solid ${error ? p.clearAnswerButtonColor : p.homeBorder}`,
                backgroundColor: p.homePanelBackground,
                color: p.homeInk,
              }}
            />

            {error && (
              <p style={{ fontSize: '0.85rem', margin: '4px 0 0', color: p.clearAnswerButtonColor }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full transition-opacity hover:opacity-90 active:opacity-75"
              style={{
                fontFamily: 'var(--font-baloo-2), sans-serif',
                marginTop: '24px',
                padding: '0.85rem',
                borderRadius: '999px',
                border: 'none',
                fontWeight: 700,
                fontSize: '1.1rem',
                color: '#ffffff',
                background: p.homeAccentGradient,
                cursor: 'pointer',
              }}
            >
              Let&apos;s Go!
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
