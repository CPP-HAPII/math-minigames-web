import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyGameData, AssistLevel, Difficulty, QuestionLog, QuizAttempt } from '@/lib/types';

// Mirrors SeriesHomePageState (game_series.dart) + PageDataManager (data_manager.dart).
// Per-series fields reset at series start; highScore persists across sessions.
// Logging via addQuestionLog (called on Continue/Skip) — never on unmount.

interface SessionState {
  // Per-series — cleared by startSession / resetSession
  score: number;
  /** Count of questions solved first-try, with no wrong attempt (wasCorrect === true). */
  correctCount: number;
  /**
   * Count of questions solved only after at least one wrong attempt
   * (wasCorrect === false). NOT a skip/abandon count — there is no skip button
   * anywhere in the app, so every question in questionLogs was eventually
   * solved. This is "clean corrects" vs "corrects that took a retry", not
   * "answered" vs "missed entirely". Stage 10 and any later analysis of
   * QuizAttempt.questions should derive the same split from QuestionLog.result
   * rather than assume "missed" means unanswered.
   */
  correctedAfterMistakeCount: number;
  progress: number;
  questionLogs: QuestionLog[];
  questions: AnyGameData[];
  currentIndex: number;
  difficulty: Difficulty;
  seriesStartedAt: number | null;

  /**
   * Assist-interaction events collected for the question currently on screen
   * (e.g. 'translation_displayed'), plus the highest-priority assist level
   * implied by them (novice > intermediate > advanced — see ASSIST_PRIORITY).
   * Cleared by submitAnswer() once folded into that question's QuestionLog,
   * so at any moment this only ever describes the in-progress question.
   */
  pendingAssistInteractions: string[];
  pendingAssistLevel: AssistLevel | null;

  // Persistent across sessions
  highScore: number;

  // Actions
  startSession: (questions: AnyGameData[], difficulty: Difficulty) => void;
  resetSession: () => void;
  addQuestionLog: (log: QuestionLog) => void;
  increaseScore: (n: number) => void;
  increaseCorrect: () => void;
  increaseCorrectedAfterMistake: () => void;
  setProgress: (p: number) => void;
  updateHighScore: () => void;

  /**
   * Record a language-assist interaction for the in-progress question (e.g.
   * a translation being triggered). Mirrors GamePageState.recordAssistUsage()
   * in game_page.dart: interactions accumulate, and pendingAssistLevel only
   * ever moves up in priority, never down, within a single question.
   */
  recordAssistInteraction: (interaction: string, level: AssistLevel) => void;

  /**
   * Score + log a completed question and advance to the next one.
   * wasCorrect follows the useGameBase onComplete(!hadMistake) contract:
   * true = first-try correct, false = correct only after a mistake. See
   * correctCount / correctedAfterMistakeCount above for what each counts.
   */
  submitAnswer: (question: AnyGameData, wasCorrect: boolean, elapsedSeconds: number) => void;

  /** Updates the high score and returns the QuizAttempt shape for Stage 10 to persist. */
  completeSeries: () => QuizAttempt;
}

const SESSION_DEFAULTS = {
  score: 0,
  correctCount: 0,
  correctedAfterMistakeCount: 0,
  progress: 0,
  questionLogs: [] as QuestionLog[],
  questions: [] as AnyGameData[],
  currentIndex: 0,
  difficulty: 'random' as Difficulty,
  seriesStartedAt: null as number | null,
  pendingAssistInteractions: [] as string[],
  pendingAssistLevel: null as AssistLevel | null,
};

/** novice (full assist) > intermediate (half) > advanced (low) — mirrors game_page.dart's _assistPriority(). */
const ASSIST_PRIORITY: Record<AssistLevel, number> = { advanced: 1, intermediate: 2, novice: 3 };

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...SESSION_DEFAULTS,
      highScore: 0,

      startSession: (questions, difficulty) =>
        set({ ...SESSION_DEFAULTS, questions, difficulty, seriesStartedAt: Date.now() }),
      resetSession: () => set(SESSION_DEFAULTS),

      addQuestionLog: (log) =>
        set((s) => ({ questionLogs: [...s.questionLogs, log] })),

      increaseScore: (n) => set((s) => ({ score: s.score + n })),
      increaseCorrect: () => set((s) => ({ correctCount: s.correctCount + 1 })),
      increaseCorrectedAfterMistake: () =>
        set((s) => ({ correctedAfterMistakeCount: s.correctedAfterMistakeCount + 1 })),

      setProgress: (p) => set({ progress: Math.max(0, Math.min(1, p)) }),

      updateHighScore: () => {
        const { score, highScore } = get();
        if (score > highScore) set({ highScore: score });
      },

      recordAssistInteraction: (interaction, level) =>
        set((s) => ({
          pendingAssistInteractions: s.pendingAssistInteractions.includes(interaction)
            ? s.pendingAssistInteractions
            : [...s.pendingAssistInteractions, interaction],
          pendingAssistLevel:
            s.pendingAssistLevel === null || ASSIST_PRIORITY[level] > ASSIST_PRIORITY[s.pendingAssistLevel]
              ? level
              : s.pendingAssistLevel,
        })),

      submitAnswer: (question, wasCorrect, elapsedSeconds) => {
        const {
          addQuestionLog,
          increaseScore,
          increaseCorrect,
          increaseCorrectedAfterMistake,
          setProgress,
          pendingAssistInteractions,
          pendingAssistLevel,
        } = get();

        addQuestionLog({
          questionId: question.id,
          skills: question.skills,
          result: wasCorrect,
          timeTakenInSeconds: elapsedSeconds,
          assistUsed: pendingAssistLevel,
          assistInteractions: pendingAssistInteractions,
        });
        increaseScore(question.score);
        if (wasCorrect) {
          increaseCorrect();
        } else {
          increaseCorrectedAfterMistake();
        }

        const { questions, currentIndex } = get();
        const nextIndex = currentIndex + 1;
        set({ currentIndex: nextIndex, pendingAssistInteractions: [], pendingAssistLevel: null });
        setProgress(questions.length > 0 ? nextIndex / questions.length : 1);
      },

      completeSeries: () => {
        get().updateHighScore();
        const { questionLogs, difficulty, seriesStartedAt } = get();
        return {
          startTime: new Date(seriesStartedAt ?? Date.now()),
          submissionTime: new Date(),
          difficulty,
          questions: questionLogs,
        };
      },
    }),
    {
      name: 'highscore',
      partialize: (state) => ({ highScore: state.highScore }),
    },
  ),
);
