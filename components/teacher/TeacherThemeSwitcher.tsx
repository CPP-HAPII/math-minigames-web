'use client';

import { useThemeStore } from '@/lib/stores/themeStore';
import { useDashboardTheme } from '@/lib/hooks/useDashboardTheme';
import { themes } from '@/lib/themes';
import { teacherDashboardThemes } from '@/lib/teacherDashboardThemes';

/** Small pill switcher in the dashboard's header banner. It sets the same
 * app-wide theme as components/ThemeSwitcher.tsx, so the choice carries over
 * to the sign-in, home and play screens (and back). */
export default function TeacherThemeSwitcher() {
  const setTheme = useThemeStore((s) => s.setTheme);
  const t = useDashboardTheme();

  return (
    <div role="group" aria-label="Dashboard theme" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {teacherDashboardThemes.map((option) => {
        const active = option.idKey === t.idKey;
        // Set the app-wide index of the matching lib/themes.ts entry.
        const appIndex = Math.max(0, themes.findIndex((th) => th.idKey === option.idKey));
        return (
          <button
            key={option.idKey}
            type="button"
            onClick={() => setTheme(appIndex)}
            aria-pressed={active}
            aria-label={`Switch to ${option.label} dashboard theme`}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.7rem',
              borderRadius: '999px',
              border: active ? '1.5px solid transparent' : `1.5px solid ${t.onBrand}33`,
              backgroundColor: active ? t.headerPillActive : 'transparent',
              color: t.onBrand,
              opacity: active ? 1 : 0.75,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
