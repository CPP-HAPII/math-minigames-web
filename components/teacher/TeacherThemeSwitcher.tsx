'use client';

import { useTeacherDashboardThemeStore, selectActiveDashboardTheme } from '@/lib/stores/teacherDashboardThemeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { teacherDashboardThemes } from '@/lib/teacherDashboardThemes';

/** Small pill switcher for the teacher dashboard's own color themes — mirrors
 * components/ThemeSwitcher.tsx's pattern, against a separate store so it
 * never follows the kid-facing play-screen theme. */
export default function TeacherThemeSwitcher() {
  const themeIndex = useTeacherDashboardThemeStore((s) => s.themeIndex);
  const setTheme = useTeacherDashboardThemeStore((s) => s.setTheme);
  const active = useTeacherDashboardThemeStore(selectActiveDashboardTheme);
  const hydrated = useHydrated();
  const t = hydrated ? active : teacherDashboardThemes[0];

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {teacherDashboardThemes.map((themeOption, i) => {
        const isActive = i === themeIndex;
        return (
          <button
            key={themeOption.idKey}
            type="button"
            onClick={() => setTheme(i)}
            aria-label={`Switch to ${themeOption.label} dashboard theme`}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.7rem',
              borderRadius: '999px',
              border: isActive ? '1.5px solid transparent' : `1.5px solid ${t.text}33`,
              backgroundColor: isActive ? t.accent : 'transparent',
              color: isActive ? t.accentText : t.text,
              opacity: isActive ? 1 : 0.75,
              cursor: 'pointer',
            }}
          >
            {themeOption.label}
          </button>
        );
      })}
    </div>
  );
}
