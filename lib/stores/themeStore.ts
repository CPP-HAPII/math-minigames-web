import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themes } from '@/lib/themes';
import type { ColorProfile } from '@/lib/themes';

// Mirrors ThemeController from theme_controller.dart.
// Replaces the 'theme_id' SharedPreferences key with localStorage.
// CSS wiring is deferred — this store only holds the state.

interface ThemeState {
  themeIndex: number;
  setTheme: (index: number) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeIndex: 0,
      setTheme: (index) => set({ themeIndex: Math.max(0, Math.min(3, index)) }),
    }),
    {
      name: 'theme_id',
      partialize: (state) => ({ themeIndex: state.themeIndex }),
    },
  ),
);

/** Selector: pass to useThemeStore() to subscribe to the active ColorProfile. */
export const selectActiveProfile = (state: ThemeState): ColorProfile =>
  themes[state.themeIndex] ?? themes[0];
