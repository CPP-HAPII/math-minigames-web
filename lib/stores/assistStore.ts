import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssistLevel } from '@/lib/types';

// Mirrors AssistController + AssistLevelService from assist_controller.dart / lang_assist.dart.
// Replaces the 'lang_assist_level' SharedPreferences key with localStorage.

interface AssistState {
  level: AssistLevel;
  setLevel: (level: AssistLevel) => void;
}

export const useAssistStore = create<AssistState>()(
  persist(
    (set) => ({
      level: 'novice',
      setLevel: (level) => set({ level }),
    }),
    {
      name: 'lang_assist_level',
      partialize: (state) => ({ level: state.level }),
    },
  ),
);
