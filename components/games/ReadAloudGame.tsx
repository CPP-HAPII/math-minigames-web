'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, ReadAloudGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { convertNumbersAndSymbolsToWords } from '@/lib/numberToWords';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';

interface ReadAloudGameProps {
  question: ReadAloudGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** The two validation outcomes. Read Aloud has no "incomplete" state — there's nothing to select, only speak. */
type CheckResult = 'wrong' | 'correct';

const DEFAULT_TRANSCRIPT_PLACEHOLDER = 'Press the button to start speaking and your words will appear here!';

/**
 * Validate the spoken transcript against nested accepted answers.
 * Ported from AudioTranscriptionWidgetState.validateAnswer() in reading.dart,
 * with one deliberate change: Dart only lowercases + collapses whitespace
 * before comparing. Speech-to-text transcripts vary in punctuation/casing
 * even more than typed input does, so this uses the same
 * normalizeComparisonString() TypingGame/FillBlanksGame already rely on
 * (also strips punctuation and the standalone word "and") rather than the
 * weaker Dart comparison.
 */
function evaluateTranscript(transcript: string, answers: string[][]): CheckResult {
  const norm = normalizeComparisonString(transcript);
  return answers.some((answer) => normalizeComparisonString(answer.join(' ')) === norm) ? 'correct' : 'wrong';
}

export default function ReadAloudGame({ question, assistLevel, onComplete }: ReadAloudGameProps) {
  const base = useGameBase(question.score);
  const speech = useSpeechRecognition();

  const [result, setResult] = useState<CheckResult | null>(null);
  const solved = result === 'correct';

  // The transcript actually compared against multiAcceptedAnswers: STT engines
  // commonly transcribe spoken numbers as digits ("476"), so when
  // useNumWordProtocol is set (the default for every seeded question), the
  // digits get converted back to their written-word form ("four hundred
  // seventy six") to match the word-form accepted-answer variants.
  const processedTranscript = question.useNumWordProtocol
    ? convertNumbersAndSymbolsToWords(speech.transcript)
    : speech.transcript;

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  function handleToggleListening() {
    if (solved || !speech.supported) return;
    if (speech.status === 'listening') {
      speech.stop();
    } else {
      speech.start();
    }
    setResult(null); // clear stale feedback once the player starts over
  }

  function handleClear() {
    if (solved) return;
    speech.reset();
    setResult(null);
  }

  function handleCheck() {
    const outcome = evaluateTranscript(processedTranscript, question.multiAcceptedAnswers);
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else {
      base.markMistake();
    }
  }

  // ── Styles (shared look with TypingGame) ────────────────────────────────────
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const actionButton = (bg: string, disabled: boolean): React.CSSProperties => ({
    backgroundColor: disabled ? p.disabledButtonColor : bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.65rem 1.4rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const feedback = (() => {
    switch (result) {
      case 'correct':
        return { text: '✓ Correct!', color: p.checkAnswerButtonColor };
      case 'wrong':
        return { text: 'Try again — that isn’t quite right.', color: p.clearAnswerButtonColor };
      default:
        return null;
    }
  })();

  const micStatusText = (() => {
    switch (speech.status) {
      case 'listening':
        return 'Listening…';
      case 'stopped':
        return null; // transcript itself is the feedback once stopped
      case 'error':
        return speech.error;
      default:
        return null;
    }
  })();

  const checkDisabled = processedTranscript.trim().length === 0 || solved || !speech.supported;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section
      style={{
        backgroundColor: p.backgroundColor,
        color: p.textColor,
        padding: '1.5rem 1rem 3rem',
        minHeight: '100%',
      }}
    >
      {/* Written prompt — the instruction (Dart: titleText). */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: p.contrastTextColor }}>
          {question.writtenPrompt}
        </p>
      </div>

      {/*
        Problem text — shown upfront, unlike Playback (Read Aloud is a
        speak-the-answer exercise, not a listening exercise; the question
        itself is read, not heard). The language-assist UI (translation,
        hover glossary, TTS) wraps this in Stages 12–14; `assistLevel` will
        drive that wrapper. This is the clean spot for it.
      */}
      <div style={{ ...card, textAlign: 'center' }} data-assist-level={assistLevel}>
        <p style={{ fontSize: '1.6rem', margin: 0, color: p.contrastTextColor }}>
          {question.displayedProblem}
        </p>
        {question.additionalInstructions && (
          <p style={{ fontSize: '0.9rem', margin: '0.6rem 0 0', opacity: 0.8 }}>
            {question.additionalInstructions}
          </p>
        )}
      </div>

      {/* Speech controls + live transcript. */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Your phrase
        </p>

        {!speech.supported ? (
          <p style={{ color: p.clearAnswerButtonColor, fontWeight: 700 }}>
            This feature requires Chrome. Speech recognition isn&rsquo;t available in this browser.
          </p>
        ) : (
          <>
            <button
              onClick={handleToggleListening}
              disabled={solved}
              style={actionButton(speech.status === 'listening' ? p.clearAnswerButtonColor : p.buttonColor, solved)}
            >
              {speech.status === 'listening' ? '⏹ Stop Listening' : '🎤 Start Speaking'}
            </button>
            {micStatusText && (
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', opacity: 0.85 }}>{micStatusText}</p>
            )}
            <p style={{ fontSize: '1.15rem', margin: '0.75rem 0 0', color: p.contrastTextColor }}>
              {speech.transcript || DEFAULT_TRANSCRIPT_PLACEHOLDER}
            </p>
          </>
        )}
      </div>

      {/* Actions. */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button onClick={handleCheck} disabled={checkDisabled} style={actionButton(p.checkAnswerButtonColor, checkDisabled)}>
          Check Answer
        </button>
        <button
          onClick={handleClear}
          disabled={speech.transcript.length === 0 || solved}
          style={actionButton(p.clearAnswerButtonColor, speech.transcript.length === 0 || solved)}
        >
          Clear
        </button>
      </div>

      {/* Feedback. */}
      {feedback && (
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '1.1rem', fontWeight: 700, color: feedback.color }}>
          {feedback.text}
        </p>
      )}
    </section>
  );
}
