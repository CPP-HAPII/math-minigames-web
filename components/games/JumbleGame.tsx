'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, JumbleGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';

interface JumbleGameProps {
  question: JumbleGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** The three validation outcomes. Ported from GameFormState.validateAnswer(). */
type CheckResult = 'incomplete' | 'wrong' | 'correct';

/**
 * Validate an ordered token selection against the accepted answers.
 * Ported from GameFormState.validateAnswer() in jumble.dart:
 *
 *   1. Lenient whole-phrase match (normalized join) — accepts even when fewer
 *      buttons than maxSelection are picked, e.g. a button combining tokens.
 *   2. Fewer than maxSelection tokens picked → incomplete.
 *   3. Ordered token-wise exact match against any accepted answer → correct.
 *   4. Otherwise → wrong.
 */
function evaluateSelection(
  selected: string[],
  answers: string[][],
  maxSelection: number,
): CheckResult {
  const normSelected = normalizeComparisonString(selected.join(' '));
  for (const answer of answers) {
    if (normalizeComparisonString(answer.join(' ')) === normSelected) return 'correct';
  }

  if (selected.length < maxSelection) return 'incomplete';

  for (const answer of answers) {
    if (
      answer.length === selected.length &&
      answer.every((token, i) => token === selected[i])
    ) {
      return 'correct';
    }
  }

  return 'wrong';
}

export default function JumbleGame({ question, assistLevel, onComplete }: JumbleGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order. Index-based (not value-based as
  // the Dart `contains` was) so each button is used once even with duplicate labels.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);

  const solved = result === 'correct';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);

  function handleSelect(i: number) {
    if (solved) return;
    setSelectedIndices((prev) => {
      if (prev.includes(i)) return prev; // each button used once
      if (prev.length >= maxSelection) return prev; // cap at maxSelection (Dart: currentCount < maxSelection)
      return [...prev, i];
    });
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (solved) return;
    setSelectedIndices([]);
    setResult(null);
  }

  function handleCheck() {
    const outcome = evaluateSelection(
      selectedTokens,
      question.multiAcceptedAnswers,
      maxSelection,
    );
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else if (outcome === 'wrong') {
      base.markMistake();
    }
    // 'incomplete' → just show the "select more answers" prompt.
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const wordButton = (disabled: boolean): React.CSSProperties => ({
    backgroundColor: disabled ? p.disabledButtonColor : p.buttonColor,
    color: p.textColor,
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.6rem 1.1rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

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

  const feedback = (() => {
    switch (result) {
      case 'correct':
        return { text: '✓ Correct!', color: p.checkAnswerButtonColor };
      case 'wrong':
        return { text: 'Try again — that order isn’t quite right.', color: p.clearAnswerButtonColor };
      case 'incomplete':
        return { text: 'Please select more answers.', color: p.clearAnswerButtonColor };
      default:
        return null;
    }
  })();

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
      {/* Written prompt — the instruction (Dart: titleQuestion). */}
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
        <p style={{ fontSize: '1.6rem', margin: 0, color: p.contrastTextColor }}>
          {question.displayedProblem}
        </p>
      </div>

      {/* Your answer — selected tokens in order. */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Your answer
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', minHeight: '1.5rem' }}>
          {selectedTokens.map((token, i) => (
            <span key={i} style={{ fontSize: '1.15rem', color: p.contrastTextColor }}>
              {token}
            </span>
          ))}
        </div>
      </div>

      {/* Word-button palette. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          justifyContent: 'center',
          maxWidth: '760px',
          margin: '1rem auto',
        }}
      >
        {question.optionList.map((option, i) => {
          const disabled = solved || selectedIndices.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={disabled}
              style={wordButton(disabled)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Actions. */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={handleCheck}
          disabled={selectedIndices.length === 0 || solved}
          style={actionButton(p.checkAnswerButtonColor, selectedIndices.length === 0 || solved)}
        >
          Check Answer
        </button>
        <button
          onClick={handleClear}
          disabled={selectedIndices.length === 0 || solved}
          style={actionButton(p.clearAnswerButtonColor, selectedIndices.length === 0 || solved)}
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
