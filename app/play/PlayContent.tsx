'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { selectSeriesQuestions } from '@/lib/session';
import { SKILL_MAP } from '@/lib/skillMap';
import { themes, type ColorProfile } from '@/lib/themes';
import type { AnyGameData, Difficulty } from '@/lib/types';
import JumbleGame from '@/components/games/JumbleGame';
import TypingGame from '@/components/games/TypingGame';
import FillBlanksGame from '@/components/games/FillBlanksGame';

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'intermediate', 'hard', 'random'];

/** How long the "✓ Correct!" / feedback state stays on screen before the series advances. */
const FEEDBACK_DELAY_MS = 500;

function isDifficulty(v: string | null): v is Difficulty {
  return v !== null && (VALID_DIFFICULTIES as string[]).includes(v);
}

export default function PlayContent() {
  const searchParams = useSearchParams();
  const difficultyParam = searchParams.get('difficulty');
  const difficulty: Difficulty = isDifficulty(difficultyParam) ? difficultyParam : 'random';
  const category = searchParams.get('category') ?? '';
  const categoryLabel = category ? (SKILL_MAP[category] ?? category) : 'All Skills';

  const router = useRouter();
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const assistLevel = useAssistStore((s) => s.level);

  // ── Question bank loading ───────────────────────────────────────────────────
  const isLoaded = useGameDataStore((s) => s.isLoaded);
  const isLoading = useGameDataStore((s) => s.isLoading);
  const loadError = useGameDataStore((s) => s.error);
  const initBanks = useGameDataStore((s) => s.initBanks);
  const easyBank = useGameDataStore((s) => s.easyBank);
  const intermediateBank = useGameDataStore((s) => s.intermediateBank);
  const hardBank = useGameDataStore((s) => s.hardBank);
  const sequences = useGameDataStore((s) => s.sequences);

  useEffect(() => {
    initBanks();
  }, [initBanks]);

  // ── Session wiring ──────────────────────────────────────────────────────────
  const questions = useSessionStore((s) => s.questions);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const score = useSessionStore((s) => s.score);
  const correctCount = useSessionStore((s) => s.correctCount);
  const correctedAfterMistakeCount = useSessionStore((s) => s.correctedAfterMistakeCount);
  const highScore = useSessionStore((s) => s.highScore);
  const startSession = useSessionStore((s) => s.startSession);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);
  const completeSeries = useSessionStore((s) => s.completeSeries);
  const resetSession = useSessionStore((s) => s.resetSession);

  // Build the series exactly once per (category, difficulty) navigation, once banks are loaded.
  const startedKeyRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const preSeriesHighScoreRef = useRef(highScore);

  useEffect(() => {
    if (!isLoaded) return;
    const key = `${category}|${difficulty}`;
    if (startedKeyRef.current === key) return;
    startedKeyRef.current = key;
    completedRef.current = false;
    preSeriesHighScoreRef.current = highScore;

    const selected = selectSeriesQuestions(
      { easyBank, intermediateBank, hardBank },
      sequences,
      category,
      difficulty,
    );
    startSession(selected, difficulty);
  }, [isLoaded, category, difficulty, easyBank, intermediateBank, hardBank, sequences, startSession, highScore]);

  const currentQuestion: AnyGameData | undefined = questions[currentIndex];
  const seriesComplete = isLoaded && questions.length > 0 && currentIndex >= questions.length;

  // Per-question timer, tracked at the series level so onComplete(wasCorrect)
  // in the game components stays untouched — it never needs to report timing.
  const questionStartRef = useRef<number>(0);
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQuestion?.id]);

  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    if (!seriesComplete || completedRef.current) return;
    completedRef.current = true;
    setIsNewHighScore(score > 0 && score > preSeriesHighScoreRef.current);
    const attempt = completeSeries();
    // Stage 10 will persist `attempt` to quizAttempts/{userId}/attempts/{autoId}
    // (append model, addDoc). Logged here as the Stage 9 -> 10 hand-off point.
    console.log('[PlayContent] Series complete — QuizAttempt ready for Stage 10:', attempt);
  }, [seriesComplete, completeSeries, score]);

  // Holds the pending "advance to next question" timer so it can be cancelled
  // if the player navigates away mid-delay (e.g. Play Again) or the component
  // unmounts. At most one is ever pending, since the current game's inputs are
  // disabled once solved (see JumbleGame/TypingGame/FillBlanksGame `solved`).
  const pendingAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingAdvanceRef.current !== null) clearTimeout(pendingAdvanceRef.current);
    };
  }, []);

  function handleAnswered(question: AnyGameData, wasCorrect: boolean) {
    const elapsedSeconds = Math.floor((Date.now() - questionStartRef.current) / 1000);
    // onComplete and the currentIndex advance used to land in the same React
    // commit, so the game component's own "✓ Correct!" feedback never actually
    // painted before the series swapped in the next question. Delaying the
    // advance gives the player a moment to see it.
    pendingAdvanceRef.current = setTimeout(() => {
      pendingAdvanceRef.current = null;
      submitAnswer(question, wasCorrect, elapsedSeconds);
    }, FEEDBACK_DELAY_MS);
  }

  // Built inline (rather than via a helper function called from JSX) so the ref
  // read inside handleAnswered stays inside this component's known event-handler
  // closures, not passed through an intermediate plain function during render.
  let gameElement: React.ReactNode = null;
  if (currentQuestion) {
    const onComplete = (wasCorrect: boolean) => handleAnswered(currentQuestion, wasCorrect);
    switch (currentQuestion.gameType) {
      case 'jumble':
        gameElement = (
          <JumbleGame key={currentQuestion.id} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />
        );
        break;
      case 'typing':
        gameElement = (
          <TypingGame key={currentQuestion.id} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />
        );
        break;
      case 'fill':
        gameElement = (
          <FillBlanksGame key={currentQuestion.id} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />
        );
        break;
      default:
        // Unreachable: selectSeriesQuestions() filters the pool to SUPPORTED_GAME_TYPES.
        break;
    }
  }

  function handlePlayAgain() {
    if (pendingAdvanceRef.current !== null) clearTimeout(pendingAdvanceRef.current);
    resetSession();
    startedKeyRef.current = null;
    router.push('/home');
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const actionButton: React.CSSProperties = {
    backgroundColor: p.buttonColor,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.65rem 1.4rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '1.5rem',
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading || !isLoaded) {
    return (
      <Centered p={p}>
        <p style={{ fontSize: '1.1rem' }}>{loadError ? `Error: ${loadError}` : 'Loading questions…'}</p>
      </Centered>
    );
  }

  // ── Empty pool ───────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <Centered p={p}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>No questions available</h1>
        <p style={{ fontSize: '1rem' }}>
          There are no {difficulty} questions for &ldquo;{categoryLabel}&rdquo; yet.
        </p>
        <button onClick={() => router.push('/home')} style={actionButton}>
          ← Back to Home
        </button>
      </Centered>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (seriesComplete) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: p.backgroundColor, color: p.textColor, padding: '2rem 1rem' }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 1rem', color: p.contrastTextColor }}>
            Series Complete!
          </h1>
          <p style={{ fontSize: '1.2rem', margin: '0.35rem 0' }}>Score: <strong>{score}</strong></p>
          {isNewHighScore && (
            <p style={{ fontSize: '1rem', fontWeight: 700, color: p.checkAnswerButtonColor }}>New high score!</p>
          )}
          <p style={{ fontSize: '1rem', margin: '0.35rem 0' }}>High Score: {highScore}</p>
          <p style={{ fontSize: '1rem', margin: '0.35rem 0' }}>
            Correct on first try: {correctCount} / {questions.length}
          </p>
          <p style={{ fontSize: '1rem', margin: '0.35rem 0' }}>
            Corrected after a mistake: {correctedAfterMistakeCount}
          </p>
          <button onClick={handlePlayAgain} style={actionButton}>
            ← Back to Home
          </button>
        </div>
      </main>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', backgroundColor: p.backgroundColor, color: p.textColor }}>
      <header style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontWeight: 700 }}>{categoryLabel}</span>
        <span>Question {currentIndex + 1} / {questions.length}</span>
        <span>Score: {score}</span>
      </header>

      {gameElement}
    </main>
  );
}

function Centered({ p, children }: { p: ColorProfile; children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: p.backgroundColor,
        color: p.textColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {children}
    </main>
  );
}
