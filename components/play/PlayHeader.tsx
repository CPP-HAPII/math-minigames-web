'use client';

import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';
import SettingsMenu from '@/components/SettingsMenu';

/**
 * Play-screen header: the level/sublevel title on the left and the settings gear
 * (Language Assist + color palette) on the right. Same bar as the home screen's
 * header, drawn from the same ColorProfile fields. The score and the calculator
 * that used to sit here are gone: the calculator now lives in the Math Assist panel.
 */
export default function PlayHeader({ title }: { title: string }) {
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];
  const gradient = Boolean(p.homeWelcomeGradient);

  return (
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
      <h1
        style={{
          fontFamily: p.homeWelcomeFont,
          fontWeight: gradient ? 700 : 800,
          fontSize: gradient ? 'clamp(22px, 3vw, 30px)' : 'clamp(19px, 2.6vw, 26px)',
          lineHeight: 1.25,
          margin: 0,
          color: gradient ? 'transparent' : p.homeWelcomeColor,
          background: p.homeWelcomeGradient || undefined,
          backgroundClip: gradient ? 'text' : undefined,
          WebkitBackgroundClip: gradient ? 'text' : undefined,
        }}
      >
        {title}
      </h1>

      <SettingsMenu profile={p} hydrated={hydrated} />
    </header>
  );
}
