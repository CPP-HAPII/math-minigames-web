'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGameDataStore } from '@/lib/stores/gameDataStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useAssistStore } from '@/lib/stores/assistStore';
import { useUserStore } from '@/lib/stores/userStore';
import { selectSublevelQuestions } from '@/lib/session';
import { startQuizAttempt, updateQuizAttemptProgress } from '@/lib/services/quizAttemptService';
import { SUBLEVEL_MAP } from '@/lib/levelMap';
import { formatCorrectAnswer } from '@/lib/formatCorrectAnswer';
import { usePlayTokens, type PlayTokens } from '@/lib/usePlayTokens';
import type { AnyGameData, Difficulty } from '@/lib/types';
import PlayHeader from '@/components/play/PlayHeader';
import JumbleGame from '@/components/games/JumbleGame';
import TypingGame from '@/components/games/TypingGame';
import FillBlanksGame from '@/components/games/FillBlanksGame';
import PlaybackGame from '@/components/games/PlaybackGame';
import ReadAloudGame from '@/components/games/ReadAloudGame';
import LanguageAssistPanel from '@/components/play/LanguageAssistPanel';
import MathAssistPanel from '@/components/play/MathAssistPanel';
import PlayProgress from '@/components/play/PlayProgress';
import type { CompletionInfo } from '@/components/play/useQuestionOutcome';

/** How long the "✓ Correct!" feedback stays on screen before the series advances. A wrong answer waits for the student's "Next question" instead. */
const FEEDBACK_DELAY_MS = 500;

type WriteStatus = 'idle' | 'saving' | 'saved' | 'error';

/** A string field off a question, or '' — questions are a union and not every type has every field (and Firestore data can have nulls). */
function textField(q: AnyGameData, key: string): string {
  const value = (q as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

/** The words the student reads: the problem, or for a fill-in-the-blank with no problem text its sentence, or for Playback its transcript. */
function promptOf(q: AnyGameData, fallback: string): string {
  return textField(q, 'displayedProblem') || textField(q, 'blankForm') || textField(q, 'audioTranscript') || fallback;
}

// Plain <style> (not styled-jsx) so the two-column layout can collapse to one column on narrow screens.
const PLAY_LAYOUT_CSS = `
.mm-play-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; }
.mm-play-aside { display: flex; flex-direction: column; gap: 18px; position: sticky; top: 16px; }
@media (max-width: 920px) {
  .mm-play-grid { grid-template-columns: minmax(0, 1fr); }
  .mm-play-aside { position: static; }
}
`;

export default function PlayContent() {
  const searchParams = useSearchParams();
  const level = Number(searchParams.get('level') ?? '0') || 0;
  const sublevel = searchParams.get('sublevel') ?? '';
  const sublevelName = sublevel ? (SUBLEVEL_MAP[sublevel] ?? '') : '';
  const sublevelLabel = sublevel
    ? `Level ${level}, sublevel ${sublevel}${sublevelName ? ` • ${sublevelName}` : ''}`
    : 'All Skills';

  const router = useRouter();
  const t = usePlayTokens();

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
  const questionLogs = useSessionStore((s) => s.questionLogs);
  const progress = useSessionStore((s) => s.progress);
  const originalQuestionCount = useSessionStore((s) => s.originalQuestionCount);
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
  const [retryIntroDismissed, setRetryIntroDismissed] = useState(false);

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
    setRetryIntroDismissed(false);

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
  // `questions` grows when a wrong question is queued for another pass. The
  // series is complete only when the active queue has been fully consumed;
  // `originalQuestionCount` is used for user-facing totals because the queue
  // can contain retries.
  const seriesComplete = isLoaded && originalQuestionCount > 0 && currentIndex >= questions.length;
  const initialIncorrectCount = Math.max(0, originalQuestionCount - correctCount);
  const showRetryIntro =
    !seriesComplete &&
    originalQuestionCount > 0 &&
    currentIndex >= originalQuestionCount &&
    initialIncorrectCount > 0 &&
    !retryIntroDismissed;

  // Per-question timer, tracked at the series level so onComplete in the game
  // components never needs to report timing (a wrong answer reports when it was
  // answered, via CompletionInfo, since the student then reads the correct
  // answer before pressing Next).
  const questionStartRef = useRef<number>(0);
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQuestion?.id, currentIndex]);

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
    setRetryToken((n) => n + 1);
  }

  // Holds the pending "advance to next question" timer so it can be cancelled
  // if the player navigates away mid-delay (e.g. Back to Home) or the component
  // unmounts. At most one is ever pending, since the current game's inputs are
  // disabled once it is answered.
  const pendingAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingAdvanceRef.current !== null) clearTimeout(pendingAdvanceRef.current);
    };
  }, []);

  function handleAnswered(question: AnyGameData, wasCorrect: boolean, info?: CompletionInfo) {
    // A game can emit a completion callback from more than one browser event
    // (or a delayed callback can race with a second click). Only one advance
    // may be pending for the currently displayed question.
    if (pendingAdvanceRef.current !== null) return;

    const answeredAt = info?.answeredAt ?? Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((answeredAt - questionStartRef.current) / 1000));
    // A correct answer holds the screen briefly so the game's own "✓ Correct!"
    // feedback paints before the next question swaps in. A wrong answer has
    // already been read by the student (they pressed Next), so it moves on at once.
    pendingAdvanceRef.current = setTimeout(
      () => {
        pendingAdvanceRef.current = null;
        submitAnswer(question, wasCorrect, elapsedSeconds);
      },
      wasCorrect ? FEEDBACK_DELAY_MS : 0,
    );
  }

  // Built inline (rather than via a helper function called from JSX) so the ref
  // read inside handleAnswered stays inside this component's known event-handler
  // closures, not passed through an intermediate plain function during render.
  const questionKey = currentQuestion ? `${currentQuestion.id}-${currentIndex}` : '';
  let gameElement: React.ReactNode = null;
  if (currentQuestion) {
    const onComplete = (wasCorrect: boolean, info?: CompletionInfo) => handleAnswered(currentQuestion, wasCorrect, info);
    switch (currentQuestion.gameType) {
      case 'jumble':
        gameElement = <JumbleGame key={questionKey} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />;
        break;
      case 'typing':
        gameElement = <TypingGame key={questionKey} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />;
        break;
      case 'fill':
        gameElement = <FillBlanksGame key={questionKey} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />;
        break;
      case 'playback':
        gameElement = <PlaybackGame key={questionKey} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />;
        break;
      case 'reading':
        gameElement = <ReadAloudGame key={questionKey} question={currentQuestion} assistLevel={assistLevel} onComplete={onComplete} />;
        break;
      default:
        // Unreachable: selectSeriesQuestions() filters the pool to SUPPORTED_GAME_TYPES.
        break;
    }
  }

  function handleBackHome() {
    if (pendingAdvanceRef.current !== null) {
      clearTimeout(pendingAdvanceRef.current);
      pendingAdvanceRef.current = null;
    }
    resetSession();
    startedKeyRef.current = null;
    router.push('/home');
  }

  // ── Shared page styles ───────────────────────────────────────────────────────
  const panelCard: React.CSSProperties = {
    background: t.cardBg,
    border: `1.5px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: '22px 26px',
    margin: '0 auto 16px',
    maxWidth: 760,
    width: '100%',
    boxSizing: 'border-box',
    color: t.questionInk,
  };

  const actionButton: React.CSSProperties = {
    minHeight: 50,
    padding: '10px 28px',
    borderRadius: 14,
    border: 'none',
    background: t.primaryBg,
    color: t.primaryInk,
    boxShadow: `0 3px 10px ${t.primaryShadow}`,
    fontFamily: t.displayFont,
    fontWeight: 700,
    fontSize: '1.2rem',
    cursor: 'pointer',
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading || !isLoaded) {
    return (
      <Centered t={t}>
        <p style={{ fontSize: '1.1rem' }}>{loadError ? `Error: ${loadError}` : 'Loading questions…'}</p>
      </Centered>
    );
  }

  // ── Empty pool ───────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <Centered t={t}>
        <h1 style={{ fontFamily: t.displayFont, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>No questions available</h1>
        <p style={{ fontSize: '1rem', margin: 0 }}>There are no questions for &ldquo;{sublevelLabel}&rdquo; yet.</p>
        <button onClick={() => router.push('/home')} style={{ ...actionButton, marginTop: 12 }}>
          ← Back to Home
        </button>
      </Centered>
    );
  }

  // ── Initial-round summary before retries ───────────────────────────────────
  if (showRetryIntro) {
    return (
      <Centered t={t}>
        <div style={{ ...panelCard, textAlign: 'center', maxWidth: 620, margin: 0 }}>
          <h1 style={{ fontFamily: t.displayFont, fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px', color: t.heading }}>
            Initial Round Complete!
          </h1>
          <p style={{ fontSize: '1.05rem', margin: '0 0 20px' }}>Here&rsquo;s how you did on the first pass:</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
            <Stat t={t} value={correctCount} label="Correct" color={t.success} />
            <Stat t={t} value={initialIncorrectCount} label="Incorrect" color={t.danger} />
          </div>

          <h2 style={{ fontFamily: t.displayFont, fontSize: '1.35rem', margin: '0 0 8px', color: t.heading }}>
            Re-attempting incorrect questions
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.5, margin: '0 auto 22px', maxWidth: 500 }}>
            The questions you missed will return now. Keep working through them until each one is answered correctly.
          </p>
          <button onClick={() => setRetryIntroDismissed(true)} style={actionButton}>
            Re-attempt incorrect questions
          </button>
        </div>
      </Centered>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (seriesComplete) {
    // One row per original question. The first log for a question is its first
    // try; every question has been answered correctly by now (the series only
    // ends once the retry queue is empty), so a first try that missed was
    // corrected on a retry. Counted from the logs rather than the store's
    // counters, so these figures can't drift from the breakdown below.
    const rows = questions.slice(0, originalQuestionCount).map((q) => {
      const firstLog = questionLogs.find((log) => log.questionId === q.id);
      return {
        question: q,
        firstTry: firstLog?.result === true,
        seconds: firstLog?.timeTakenInSeconds ?? 0,
      };
    });
    const firstTryCount = rows.filter((r) => r.firstTry).length;
    const correctedCount = rows.length - firstTryCount;

    return (
      <main style={{ minHeight: '100vh', background: t.pageBg, color: t.questionInk, fontFamily: t.bodyFont }}>
        <PlayHeader title={sublevelLabel} />
        <div style={{ padding: '28px 16px 48px' }}>
          <div style={{ ...panelCard, textAlign: 'center' }}>
            <h1 style={{ fontFamily: t.displayFont, fontSize: '1.8rem', fontWeight: 700, margin: '0 0 14px', color: t.heading }}>
              Series Complete!
            </h1>
            <p style={{ fontSize: '1.2rem', margin: '6px 0' }}>
              Score: <strong>{score}</strong>
            </p>
            {isNewHighScore && <p style={{ fontSize: '1rem', fontWeight: 700, color: t.success, margin: '6px 0' }}>New high score!</p>}
            <p style={{ fontSize: '1rem', margin: '6px 0' }}>High Score: {highScore}</p>
            <p style={{ fontSize: '1rem', margin: '6px 0' }}>
              Correct on first try: {firstTryCount} / {originalQuestionCount}
            </p>
            <p style={{ fontSize: '1rem', margin: '6px 0' }}>Corrected on a retry: {correctedCount}</p>

            {writeStatus === 'saving' && <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: 12 }}>Saving your results…</p>}
            {writeStatus === 'saved' && <p style={{ fontSize: '0.9rem', color: t.success, marginTop: 12 }}>✓ Results saved</p>}
            {writeStatus === 'error' && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.9rem', color: t.danger, fontWeight: 700, margin: 0 }}>Couldn&rsquo;t save your results.</p>
                {writeError && <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: '4px 0 0' }}>{writeError}</p>}
                <button
                  onClick={handleRetryWrite}
                  style={{ ...actionButton, minHeight: 40, marginTop: 10, padding: '6px 18px', fontSize: '0.95rem' }}
                >
                  Retry Save
                </button>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div style={{ ...panelCard, textAlign: 'left' }}>
              <h2 style={{ fontFamily: t.displayFont, fontWeight: 700, fontSize: '1.3rem', margin: '0 0 12px', color: t.heading }}>
                Question Breakdown
              </h2>
              <ol style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows.map(({ question, firstTry, seconds }, i) => (
                  <li key={`${question.id}-${i}`} style={{ fontSize: '0.95rem', lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700, color: firstTry ? t.success : t.danger }}>
                      {firstTry ? 'Correct on first try' : 'Corrected on a retry'}
                    </span>
                    {' — '}
                    {promptOf(question, question.id)} <span style={{ opacity: 0.7 }}>({seconds}s)</span>
                    {!firstTry && (
                      <div style={{ marginTop: 2, color: t.mutedInk }}>
                        Correct answer: <strong style={{ color: t.questionInk }}>{formatCorrectAnswer(question)}</strong>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={handleBackHome} style={actionButton}>
              ← Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  const retrying = currentIndex >= originalQuestionCount;
  const retryTotal = Math.max(0, questions.length - originalQuestionCount);
  const progressLabel = retrying
    ? `Retry ${currentIndex - originalQuestionCount + 1} / ${retryTotal}`
    : `Question ${currentIndex + 1} / ${originalQuestionCount}`;
  const isPlayback = currentQuestion?.gameType === 'playback';
  const assistSource = currentQuestion ? textField(currentQuestion, isPlayback ? 'audioTranscript' : 'displayedProblem') : '';

  return (
    <main style={{ minHeight: '100vh', background: t.pageBg, color: t.questionInk, fontFamily: t.bodyFont }}>
      <style>{PLAY_LAYOUT_CSS}</style>
      <PlayHeader title={sublevelLabel} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 24px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PlayProgress label={progressLabel} progress={progress} retryNote={retrying ? 'Retrying missed questions' : undefined} />

        <div className="mm-play-grid">
          <div style={{ minWidth: 0 }}>{gameElement}</div>

          <aside className="mm-play-aside" aria-label="Assist tools">
            {/* Keyed per question so the translation resets and, for Novice, auto-translates each new question. */}
            <LanguageAssistPanel
              key={questionKey}
              sourceText={assistSource}
              assistLevel={assistLevel}
              canSpeakQuestion={!isPlayback}
              canTranslateWords={!isPlayback}
            />
            <MathAssistPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ t, value, label, color }: { t: PlayTokens; value: number; label: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        maxWidth: 190,
        borderRadius: 14,
        padding: 16,
        border: `1.5px solid ${color}`,
        background: t.cardBg,
      }}
    >
      <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function Centered({ t, children }: { t: PlayTokens; children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: t.pageBg,
        color: t.questionInk,
        fontFamily: t.bodyFont,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 32,
        textAlign: 'center',
      }}
    >
      {children}
    </main>
  );
}
