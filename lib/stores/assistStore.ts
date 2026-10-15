import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssistLevel } from '@/lib/types';

// Mirrors AssistController + AssistLevelService from assist_controller.dart / lang_assist.dart.
// Replaces the 'lang_assist_level' SharedPreferences key with localStorage.

interface AssistState {
  level: AssistLevel;
  hoverTranslationEnabled: boolean;
  setHoverTranslationEnabled: (enabled: boolean) => void;
  setLevel: (level: AssistLevel) => void;
}

export const useAssistStore = create<AssistState>()(
  persist(
    (set) => ({
      level: 'novice',
      hoverTranslationEnabled: false,
      setHoverTranslationEnabled: (hoverTranslationEnabled) => set({ hoverTranslationEnabled }),
      setLevel: (level) => set({ level }),
    }),
    {
      name: 'lang_assist_level',
      partialize: (state) => ({ level: state.level, hoverTranslationEnabled: state.hoverTranslationEnabled }),
    },
  ),
);
