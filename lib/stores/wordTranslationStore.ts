import { create } from 'zustand';

/**
 * Whether hover-to-translate is switched on ("Turn on word translation" in the
 * Language Assist panel). Lives in a store rather than in the game component
 * because every game remounts per question (key={question.id}) — local state
 * would flip back off on each new question. Deliberately not persisted: it
 * resets on a page refresh, which also avoids a localStorage hydration mismatch.
 */
interface WordTranslationState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useWordTranslationStore = create<WordTranslationState>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}));
