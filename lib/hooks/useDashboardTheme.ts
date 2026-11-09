import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { themes } from '@/lib/themes';
import { dashboardThemeFor, type DashboardTheme } from '@/lib/teacherDashboardThemes';

/**
 * The teacher-dashboard palette for the app-wide theme (the same choice the
 * sign-in, home and play screens use). Falls back to the first theme until
 * the client has hydrated so SSR and the first client render agree (the
 * persisted store only knows the saved choice after hydration).
 */
export function useDashboardTheme(): DashboardTheme {
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  return dashboardThemeFor(hydrated ? profile.idKey : themes[0].idKey);
}
