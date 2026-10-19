'use client';

// Compact introduction page — replaces the application's login route page.tsx.
// No passwords; userId is a 3-digit numeric string, matching Flutter's validator.

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/userStore';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';
import ThemeSwitcher from '@/components/ThemeSwitcher';

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M9.7 4.3 10.2 2h3.6l.5 2.3 1.8 1 2.3-.7 1.8 3.1-1.7 1.6v2.1l1.7 1.6-1.8 3.1-2.3-.7-1.8 1-.5 2.3h-3.6l-.5-2.3-1.8-1-2.3.7L3.8 13l1.7-1.6V9.3L3.8 7.7l1.8-3.1 2.3.7 1.8-1Z"
        transform="translate(0 1.65)"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function validate(value: string): string {
  if (!value.trim()) return 'Please enter your Student ID.';
  if (!/^\d{3}$/.test(value)) return 'Student ID must be exactly 3 digits.';
  return '';
}

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const setStoreUserId = useUserStore((s) => s.setUserId);

  // Same persisted theme the home/play screens read — picking a theme on the
  // home page carries back here (and to the next student's first visit,
  // until someone changes it again), so this page can't stay hardcoded green.
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  const visuallyHiddenLabel: CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  // Shared by both edges of the banner art: fades the hills into the header
  // gradient on the left and keeps a soft edge next to the gear on the right.
  const bannerMask = 'linear-gradient(to right, transparent, #000 40%, #000 88%, transparent)';

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
      data-layout-version="reference-welcome-login-v3"
      style={{
        width: '100%',
        maxWidth: 'none',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: 'auto 1fr',
        background: p.homePageBackground,
        fontFamily: 'var(--font-nunito), sans-serif',
      }}
    >
      <header
        style={{
          position: 'relative',
          width: '100%',
          background: p.homeHeaderBackground,
          borderBottom: p.homeHeaderBorderBottom || undefined,
          // Fixed height so the banner art doesn't rescale when settings opens;
          // the dropdown is absolutely positioned and overlays the page below.
          minHeight: '92px',
          boxSizing: 'border-box',
          padding: '18px clamp(12px, 2vw, 28px)',
          display: 'grid',
          // Equal side columns keep the title on the same centerline as the card.
          gridTemplateColumns: '44px minmax(0, 1fr) 44px',
          columnGap: '8px',
          alignItems: 'center',
        }}
      >
        {/* Banner art: same theme fields and fades as CoachHeader. The wrapper
            clips the art instead of the header, so the settings dropdown can
            still hang below the header without being cut off. */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
        >
          {p.homeHeaderImage && (
            <div
              style={{
                position: 'absolute',
                right: 'calc(clamp(12px, 2vw, 28px) + 56px)', // header padding + gear (44px) + gap
                bottom: p.homeHeaderImageOffset || 0,
                height: p.homeHeaderImageHeight || '100%',
                aspectRatio: '3 / 1', // banner PNGs are 2172×724
                background: `url("${p.homeHeaderImage}") right bottom / cover no-repeat`,
                WebkitMaskImage: bannerMask,
                maskImage: bannerMask,
              }}
            />
          )}
        </div>

        <p
          style={{
            position: 'relative',
            zIndex: 1,
            gridColumn: 2,
            gridRow: 1,
            minWidth: 0,
            fontFamily: p.homeWelcomeFont,
            fontWeight: p.homeWelcomeGradient ? 700 : 800,
            fontSize: p.homeWelcomeGradient
              ? 'clamp(22px, 4.5vw, 36px)'
              : 'clamp(20px, 4.5vw, 34px)',
            lineHeight: 1.2,
            margin: 0,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            color: p.homeWelcomeGradient ? 'transparent' : p.homeWelcomeColor,
            background: p.homeWelcomeGradient || undefined,
            backgroundClip: p.homeWelcomeGradient ? 'text' : undefined,
            WebkitBackgroundClip: p.homeWelcomeGradient ? 'text' : undefined,
          }}
        >
          Math Minigames
        </p>

        <div
          style={{
            gridColumn: 3,
            gridRow: 1,
            position: 'relative',
            zIndex: 1,
            justifySelf: 'end',
            alignSelf: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            aria-controls="login-color-themes"
            title="Settings"
            onClick={() => setSettingsOpen((open) => !open)}
            className="transition-opacity hover:opacity-80"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '44px',
              height: '44px',
              boxSizing: 'border-box',
              color: p.headerColor,
              background: p.homeSurfaceBackground,
              border: 'none',
              borderRadius: '999px',
              padding: '6px',
              lineHeight: 0,
              cursor: 'pointer',
            }}
          >
            <SettingsIcon />
          </button>

          {settingsOpen && (
            <div
              id="login-color-themes"
              aria-label="Color themes"
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                zIndex: 10,
                minWidth: '224px',
                padding: '12px',
                background: p.homeHeaderBackground,
                border: `1px solid ${p.homeBorder}`,
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                transform: 'scale(1.08)',
                transformOrigin: 'top right',
              }}
            >
              <ThemeSwitcher label="" />
            </div>
          )}
        </div>
      </header>

      <div
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'grid',
          placeItems: 'center',
          padding: '48px 20px',
        }}
      >
        <div
          data-login-card
          style={{
            width: '100%',
            maxWidth: '520px',
            minHeight: '420px',
            justifySelf: 'center',
            margin: 0,
            boxSizing: 'border-box',
            backgroundColor: p.homeSurfaceBackground,
            border: `1px solid ${p.homeBorder}`,
            borderRadius: '20px',
            padding: '40px clamp(24px, 3vw, 34px) 34px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-nunito), sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(32px, 5vw, 40px)',
                lineHeight: 1.2,
                textAlign: 'center',
                margin: '0 0 12px',
                color: p.homeInk,
              }}
            >
              Welcome!
            </h1>
            <p style={{ textAlign: 'center', fontSize: '1.25rem', lineHeight: 1.5, margin: 0, color: p.homeInkSoft }}>
              Enter your Student ID to begin
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ width: '100%', marginTop: 'clamp(40px, 5vw, 64px)' }}
          >
            <label htmlFor="userId" style={visuallyHiddenLabel}>
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'student-id-error' : undefined}
              className="w-full outline-none transition-colors"
              style={{
                display: 'block',
                width: '100%',
                minWidth: 0,
                minHeight: '76px',
                boxSizing: 'border-box',
                borderRadius: '12px',
                padding: '18px 24px',
                fontSize: '1.5rem',
                lineHeight: 1.4,
                margin: 0,
                border: `2px solid ${error ? p.clearAnswerButtonColor : p.homeAccentSolid}`,
                backgroundColor: p.homePanelBackground,
                color: p.homeInk,
              }}
            />

            {error && (
              <p id="student-id-error" role="alert" style={{ fontSize: '0.95rem', margin: '4px 0 0', color: p.clearAnswerButtonColor }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full transition-opacity hover:opacity-90 active:opacity-75"
              style={{
                display: 'block',
                width: '100%',
                minHeight: '66px',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-baloo-2), sans-serif',
                marginTop: '32px',
                padding: '18px',
                borderRadius: '999px',
                border: 'none',
                fontWeight: 800,
                fontSize: '1.5rem',
                lineHeight: 1.25,
                color: p.contrastTextColor,
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