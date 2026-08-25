'use client';

import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';

interface ThemeSwitcherProps {
  /** Optional heading shown above the buttons, e.g. "Pick a color!" */
  label?: string;
}

/** Extracted from app/home/page.tsx's original inline header switcher so the
 * welcome page (app/page.tsx) can offer the same 3-theme picker. */
export default function ThemeSwitcher({ label }: ThemeSwitcherProps) {
  const themeIndex = useThemeStore((s) => s.themeIndex);
  const setTheme = useThemeStore((s) => s.setTheme);
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: label ? 'center' : 'flex-start' }}>
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-nunito), sans-serif',
            fontWeight: 700,
            fontSize: '13px',
            color: p.homeWelcomeGradient ? p.homeInkSoft : p.homeWelcomeColor,
            opacity: 0.85,
          }}
        >
          {label}
        </span>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: label ? 'center' : 'flex-start' }}>
        {themes.map((themeOption, i) => {
          const isActive = i === themeIndex;
          return (
            <button
              key={themeOption.idKey}
              type="button"
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
    </div>
  );
}
