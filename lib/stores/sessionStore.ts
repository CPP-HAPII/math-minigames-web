import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnyGameData, AssistLevel, Difficulty, QuestionLog, QuizAttempt } from '@/lib/types';

// Mirrors SeriesHomePageState (game_series.dart) + PageDataManager (data_manager.dart).
// Per-series fields reset at series start; highScore persists across sessions.
// The active question array is a queue: an incorrect question is appended to
// its end and is not considered complete until it is eventually answered
// correctly.

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
  /** One final log per question, written only after that question is correct. */
  questionLogs: QuestionLog[];
  /** Number of unique questions selected when this series began. */
  originalQuestionCount: number;
  /** Question IDs that have had at least one incorrect answer this series. */
  mistakenQuestionIds: string[];
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
   * Handle one answer submission. Incorrect answers are appended to the end
   * of the active queue; only a correct answer creates the final QuestionLog
   * and awards the question's points.
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
  originalQuestionCount: 0,
  mistakenQuestionIds: [] as string[],
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
        set({
          ...SESSION_DEFAULTS,
          questions,
          originalQuestionCount: questions.length,
          difficulty,
          seriesStartedAt: Date.now(),
        }),
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
        const state = get();
        const activeQuestion = state.questions[state.currentIndex];

        // Ignore stale or duplicate callbacks. This can happen if a delayed
        // feedback callback fires after the player has already moved on.
        if (!activeQuestion || activeQuestion.id !== question.id) return;

        const hadMistake = state.mistakenQuestionIds.includes(question.id);
        const nextIndex = state.currentIndex + 1;

        if (!wasCorrect) {
          // Keep the question in the session, but move it behind every
          // question currently waiting in the queue. If it is wrong again,
          // it is appended again, so the player keeps seeing it until correct.
          set({
            questions: [...state.questions, question],
            currentIndex: nextIndex,
            mistakenQuestionIds: hadMistake
              ? state.mistakenQuestionIds
              : [...state.mistakenQuestionIds, question.id],
            pendingAssistInteractions: [],
            pendingAssistLevel: null,
            progress:
              state.originalQuestionCount > 0
                ? state.questionLogs.length / state.originalQuestionCount
                : 1,
          });
          return;
        }

        // A newly mounted retry component reports true on its first successful
        // submission, so use the session-level mistake set to preserve the
        // meaningful distinction between a clean first-try answer and a
        // question that needed one or more retries.
        const finalWasCleanCorrect = !hadMistake;
        const log: QuestionLog = {
          questionId: question.id,
          skills: question.skills,
          result: finalWasCleanCorrect,
          timeTakenInSeconds: elapsedSeconds,
          assistUsed: state.pendingAssistLevel,
          assistInteractions: state.pendingAssistInteractions,
        };
        const nextLogs = [...state.questionLogs, log];

        set({
          questionLogs: nextLogs,
          score: state.score + question.score,
          correctCount: state.correctCount + (finalWasCleanCorrect ? 1 : 0),
          correctedAfterMistakeCount: state.correctedAfterMistakeCount + (finalWasCleanCorrect ? 0 : 1),
          currentIndex: nextIndex,
          pendingAssistInteractions: [],
          pendingAssistLevel: null,
          progress:
            state.originalQuestionCount > 0
              ? Math.min(1, nextLogs.length / state.originalQuestionCount)
              : 1,
        });
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
