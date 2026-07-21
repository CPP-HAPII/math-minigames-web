'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, TypingGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import AnswerFeedback from './AnswerFeedback';
import TranslateButton from './TranslateButton';
import HoverTranslatedText from './HoverTranslatedText';

interface TypingGameProps {
  question: TypingGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** The two validation outcomes. Typing has no "incomplete" state (Jumble does). */
type CheckResult = 'wrong' | 'correct';

/**
 * Validate a typed answer against the accepted answers.
 * Ported from _GameFormState.validateAnswer() in typing.dart, with the
 * normalization the task calls for:
 *
 *   TypingGameData.multiAcceptedAnswers is a FLAT string[] — each element is a
 *   COMPLETE answer string. Compare the whole normalized typed string against
 *   each accepted answer; do NOT split multi-word answers into tokens.
 */
function evaluateTyping(typed: string, answers: string[]): CheckResult {
  const norm = normalizeComparisonString(typed);
  return answers.some((a) => normalizeComparisonString(a) === norm) ? 'correct' : 'wrong';
}

export default function TypingGame({ question, assistLevel, onComplete }: TypingGameProps) {
  const base = useGameBase(question.score);

  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);

  const solved = result === 'correct';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  function handleChange(value: string) {
    if (solved) return;
    setTyped(value);
    setResult(null); // clear stale feedback as the answer changes
  }

  function handleCheck() {
    const outcome = evaluateTyping(typed, question.multiAcceptedAnswers);
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else {
      base.markMistake();
    }
  }

  // ── Styles (shared look with JumbleGame) ────────────────────────────────────
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const actionButton = (bg: string, disabled: boolean): React.CSSProperties => ({
    backgroundColor: bg,
    color: p.contrastTextColor,
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.65rem 1.4rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  const checkDisabled = typed.trim().length === 0 || solved;

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
      {/* Written prompt — the instruction (Dart: instructions). */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: p.contrastTextColor }}>
          {question.writtenPrompt}
        </p>
      </div>

      {/*
        Problem text — rendered plainly for now. The language-assist UI
        (translation, hover glossary, TTS) wraps this in Stages 12–14;
        `assistLevel` will drive that wrapper. This is the clean spot for it.
      */}
      <div style={{ ...card, textAlign: 'center' }} data-assist-level={assistLevel}>
        <HoverTranslatedText text={question.displayedProblem} profile={p} />
        <TranslateButton sourceText={question.displayedProblem} profile={p} />
      </div>

      {/* Answer input. */}
      <div style={{ ...card }}>
        <label
          htmlFor="typing-answer"
          style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.6rem', color: p.contrastTextColor }}
        >
          Your answer
        </label>
        <textarea
          id="typing-answer"
          value={typed}
          onChange={(e) => handleChange(e.target.value)}
          disabled={solved}
          rows={3}
          placeholder="Type your answer…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: '1.15rem',
            padding: '0.7rem 0.9rem',
            borderRadius: '0.6rem',
            border: `1px solid ${p.textColor}33`,
            backgroundColor: p.backgroundColor,
            color: p.textColor,
            resize: 'vertical',
            opacity: solved ? 0.6 : 1,
          }}
        />
      </div>

      {/* Action. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={handleCheck}
          disabled={checkDisabled}
          style={actionButton(p.checkAnswerButtonColor, checkDisabled)}
        >
          Check Answer
        </button>
      </div>

      {/* Feedback. */}
      <AnswerFeedback
        outcome={result}
        wasCleanCorrect={!base.hadMistake}
        profile={p}
        wrongMessage="Try again — that isn’t quite right."
      />
    </section>
  );
}
