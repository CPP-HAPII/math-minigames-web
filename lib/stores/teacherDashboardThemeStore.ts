import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { teacherDashboardThemes } from '@/lib/teacherDashboardThemes';
import type { DashboardTheme } from '@/lib/teacherDashboardThemes';

// Separate persisted store from lib/stores/themeStore.ts (the kid-facing
// Green/Hapii/Dark-green switcher) — deliberately not shared, so a kid
// changing their play-screen theme never changes what a teacher sees here.

interface TeacherDashboardThemeState {
  themeIndex: number;
  setTheme: (index: number) => void;
}

export const useTeacherDashboardThemeStore = create<TeacherDashboardThemeState>()(
  persist(
    (set) => ({
      themeIndex: 0,
      setTheme: (index) => set({ themeIndex: Math.max(0, Math.min(2, index)) }),
    }),
    {
      name: 'teacher_dashboard_theme_id',
      partialize: (state) => ({ themeIndex: state.themeIndex }),
    },
  ),
);

/** Selector: pass to useTeacherDashboardThemeStore() to subscribe to the active DashboardTheme. */
export const selectActiveDashboardTheme = (state: TeacherDashboardThemeState): DashboardTheme =>
  teacherDashboardThemes[state.themeIndex] ?? teacherDashboardThemes[0];
