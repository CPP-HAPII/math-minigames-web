import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuestionLog } from '@/lib/types';

// Mirrors SeriesHomePageState (game_series.dart) + PageDataManager (data_manager.dart).
// Per-series fields reset at series start; highScore persists across sessions.
// Logging via addQuestionLog (called on Continue/Skip) — never on unmount.

interface SessionState {
  // Per-series — cleared by startSession / resetSession
  score: number;
  correctCount: number;
  missedCount: number;
  progress: number;
  questionLogs: QuestionLog[];

  // Persistent across sessions
  highScore: number;

  // Actions
  startSession: () => void;
  resetSession: () => void;
  addQuestionLog: (log: QuestionLog) => void;
  increaseScore: (n: number) => void;
  increaseCorrect: () => void;
  increaseMissed: () => void;
  setProgress: (p: number) => void;
  updateHighScore: () => void;
}

const SESSION_DEFAULTS = {
  score: 0,
  correctCount: 0,
  missedCount: 0,
  progress: 0,
  questionLogs: [] as QuestionLog[],
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...SESSION_DEFAULTS,
      highScore: 0,

      startSession: () => set(SESSION_DEFAULTS),
      resetSession: () => set(SESSION_DEFAULTS),

      addQuestionLog: (log) =>
        set((s) => ({ questionLogs: [...s.questionLogs, log] })),

      increaseScore: (n) => set((s) => ({ score: s.score + n })),
      increaseCorrect: () => set((s) => ({ correctCount: s.correctCount + 1 })),
      increaseMissed: () => set((s) => ({ missedCount: s.missedCount + 1 })),

      setProgress: (p) => set({ progress: Math.max(0, Math.min(1, p)) }),

      updateHighScore: () => {
        const { score, highScore } = get();
        if (score > highScore) set({ highScore: score });
      },
    }),
    {
      name: 'highscore',
      partialize: (state) => ({ highScore: state.highScore }),
    },
  ),
);
