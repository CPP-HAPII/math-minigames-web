'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useUserStore } from '@/lib/stores/userStore';
import { selectSublevelQuestions } from '@/lib/session';
import { startQuizAttempt, updateQuizAttemptProgress } from '@/lib/services/quizAttemptService';
import { SUBLEVEL_MAP } from '@/lib/levelMap';
import { themes, type ColorProfile } from '@/lib/themes';
import type { AnyGameData, Difficulty } from '@/lib/types';
import JumbleGame from '@/components/games/JumbleGame';
import TypingGame from '@/components/games/TypingGame';
import FillBlanksGame from '@/components/games/FillBlanksGame';
import PlaybackGame from '@/components/games/PlaybackGame';
import ReadAloudGame from '@/components/games/ReadAloudGame';
import Calculator from '@/components/Calculator';
import ProgressBar from '@/components/ProgressBar';

/** How long the "✓ Correct!" / feedback state stays on screen before the series advances. */
const FEEDBACK_DELAY_MS = 500;

type WriteStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function PlayContent() {
  const searchParams = useSearchParams();
  const level = Number(searchParams.get('level') ?? '0') || 0;
  const sublevel = searchParams.get('sublevel') ?? '';
  const sublevelName = sublevel ? (SUBLEVEL_MAP[sublevel] ?? '') : '';
  const sublevelLabel = sublevel
    ? `Level ${level}, sublevel ${sublevel}${sublevelName ? ` · ${sublevelName}` : ''}`
    : 'All Skills';

  const router = useRouter();
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  const assistLevel = useAssistStore((s) => s.level);
  const userId = useUserStore((s) => s.userId);

  // ── Question bank loading ───────────────────────────────────────────────────
  const isLoaded = useGameDataStore((s) => s.isLoaded);
  const isLoading = useGameDataStore((s) => s.isLoading);
  const loadError = useGameDataStore((s) => s.error);
  const initBanks = useGameDataStore((s) => s.initBanks);
  const jumbleBank = useGameDataStore((s) => s.jumbleBank);
  const playbackBank = useGameDataStore((s) => s.playbackBank);
  const readAloudBank = useGameDataStore((s) => s.readAloudBank);
  const typingBank = useGameDataStore((s) => s.typingBank);
  const fillBlanksBank = useGameDataStore((s) => s.fillBlanksBank);

  useEffect(() => {
    initBanks();
  }, [initBanks]);

  // Combines the 5 per-type banks (rather than the per-difficulty banks, which
  // exclude 'random'-difficulty questions) into the full parsed question set —
  // a sublevel's questions can carry any difficulty tag, so selection must see
  // all of them. Mirrors app/home/page.tsx's identical bank assembly.
  const bank: AnyGameData[] = useMemo(
    () => [...jumbleBank, ...playbackBank, ...readAloudBank, ...typingBank, ...fillBlanksBank],
    [jumbleBank, playbackBank, readAloudBank, typingBank, fillBlanksBank],
  );

  // ── Session wiring ──────────────────────────────────────────────────────────
  const questions = useSessionStore((s) => s.questions);
  const currentIndex = useSessionStore((s) => s.currentIndex);
  const score = useSessionStore((s) => s.score);
  const correctCount = useSessionStore((s) => s.correctCount);
  const correctedAfterMistakeCount = useSessionStore((s) => s.correctedAfterMistakeCount);
  const progress = useSessionStore((s) => s.progress);
  const questionLogs = useSessionStore((s) => s.questionLogs);
  const highScore = useSessionStore((s) => s.highScore);
  const startSession = useSessionStore((s) => s.startSession);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);
  const completeSeries = useSessionStore((s) => s.completeSeries);
  const resetSession = useSessionStore((s) => s.resetSession);

  // Build the series exactly once per sublevel navigation, once banks are loaded.
  const startedKeyRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const preSeriesHighScoreRef = useRef(highScore);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !sublevel) return;
    if (startedKeyRef.current === sublevel) return;
    startedKeyRef.current = sublevel;
    completedRef.current = false;
    preSeriesHighScoreRef.current = highScore;

    const selected = selectSublevelQuestions(bank, sublevel);
    // A sublevel's questions all carry the same difficulty tag in practice
    // (assigned per-level at authoring time); recorded on QuizAttempt for
    // analytics continuity even though there's no difficulty selector anymore.
    const seriesDifficulty: Difficulty = selected[0]?.difficulty ?? 'random';
    startSession(selected, seriesDifficulty);

    // Creates the Firestore attempt doc immediately, not just at series end —
    // see quizAttemptService.startQuizAttempt for why. Fresh mount per
    // sublevel (this page has no in-place link to another sublevel) means
    // there's no stale attemptId from a previous session to clear here.
    if (userId && selected.length > 0) {
      startQuizAttempt(userId, new Date(), seriesDifficulty)
        .then((id) => setAttemptId(id))
        .catch((err: unknown) => {
          console.error('[PlayContent] Failed to start attempt doc:', err instanceof Error ? err.message : String(err));
        });
    }
  }, [isLoaded, sublevel, bank, startSession, highScore, userId]);

  const currentQuestion: AnyGameData | undefined = questions[currentIndex];
  const seriesComplete = isLoaded && questions.length > 0 && currentIndex >= questions.length;

  // Per-question timer, tracked at the series level so onComplete(wasCorrect)
  // in the game components stays untouched — it never needs to report timing.
  const questionStartRef = useRef<number>(0);
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQuestion?.id]);

  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Marks the series complete and updates highScore, independent of the
  // Firestore write below (which already happens per-question, not just here).
  useEffect(() => {
    if (!seriesComplete || completedRef.current) return;
    completedRef.current = true;
    setIsNewHighScore(score > 0 && score > preSeriesHighScoreRef.current);
    completeSeries();
  }, [seriesComplete, completeSeries, score]);

  // ── Firestore write: quizAttempts/{userId}/attempts/{attemptId} ─────────────
  // Fires after every answered question (questionLogs grows by one each
  // time) — not only at series completion, see quizAttemptService's
  // startQuizAttempt doc comment for why. writeStatus below is only ever
  // rendered on the results screen, but the underlying writes happen
  // throughout play, so a session abandoned mid-sublevel still leaves
  // whatever was answered so far in Firestore.
  const [writeResult, setWriteResult] = useState<{ ok: true } | { ok: false; message: string } | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!attemptId || questionLogs.length === 0) return;
    let cancelled = false;

    updateQuizAttemptProgress(userId, attemptId, questionLogs)
      .then(() => {
        if (!cancelled) setWriteResult({ ok: true });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWriteResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
    // retryToken lets handleRetryWrite() re-run the write for the current
    // questionLogs snapshot after a transient failure.
  }, [attemptId, questionLogs, userId, retryToken]);

  const writeStatus: WriteStatus = !attemptId ? 'idle' : writeResult === null ? 'saving' : writeResult.ok ? 'saved' : 'error';
  const writeError = writeResult && !writeResult.ok ? writeResult.message : null;

  function handleRetryWrite() {
    setWriteResult(null);
    setRetryToken((t) => t + 1);
  }

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
      case 'playback':
        gameElement = (
          <PlaybackGame key={currentQuestion.id} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />
        );
        break;
      case 'reading':
        gameElement = (
          <ReadAloudGame key={currentQuestion.id} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />
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
          There are no questions for &ldquo;{sublevelLabel}&rdquo; yet.
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

          {writeStatus === 'saving' && (
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.75rem' }}>Saving your results…</p>
          )}
          {writeStatus === 'saved' && (
            <p style={{ fontSize: '0.9rem', color: p.checkAnswerButtonColor, marginTop: '0.75rem' }}>
              ✓ Results saved
            </p>
          )}
          {writeStatus === 'error' && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ fontSize: '0.9rem', color: p.clearAnswerButtonColor, fontWeight: 700, margin: 0 }}>
                Couldn&rsquo;t save your results.
              </p>
              {writeError && (
                <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: '0.25rem 0 0' }}>{writeError}</p>
              )}
              <button
                onClick={handleRetryWrite}
                style={{ ...actionButton, marginTop: '0.6rem', padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}
              >
                Retry Save
              </button>
            </div>
          )}
        </div>

        {questionLogs.length > 0 && (
          <div style={{ ...card, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: p.contrastTextColor }}>
              Question Breakdown
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {questionLogs.map((log, i) => {
                const q = questions[i];
                // Playback has no displayedProblem (the question is heard, not shown) — fall back
                // to its audioTranscript so the breakdown still reads as the actual question.
                const promptText =
                  q && 'displayedProblem' in q
                    ? q.displayedProblem
                    : q && 'audioTranscript' in q
                      ? q.audioTranscript
                      : log.questionId;
                return (
                  <li key={`${log.questionId}-${i}`} style={{ fontSize: '0.9rem' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: log.result ? p.checkAnswerButtonColor : p.clearAnswerButtonColor,
                      }}
                    >
                      {log.result ? 'Correct on first try' : 'Corrected after a mistake'}
                    </span>
                    {' — '}
                    {promptText}
                    {' '}
                    <span style={{ opacity: 0.7 }}>({log.timeTakenInSeconds}s)</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
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
        <span style={{ fontWeight: 700 }}>{sublevelLabel}</span>
        <span>Question {currentIndex + 1} / {questions.length}</span>
        <span>Score: {score}</span>
        <Calculator profile={p} />
      </header>

      <div style={{ ...card, padding: '0.6rem 1.5rem' }}>
        <ProgressBar progress={progress} profile={p} />
      </div>

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
