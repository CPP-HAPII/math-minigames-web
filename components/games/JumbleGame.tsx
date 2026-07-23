'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, JumbleGameData } from '@/lib/types';
import { evaluateOrderedSelection, type OrderedSelectionResult } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import AnswerFeedback from './AnswerFeedback';
import TranslateButton from './TranslateButton';
import HoverTranslatedText from './HoverTranslatedText';
import SpeakQuestionButton from './SpeakQuestionButton';

interface JumbleGameProps {
  question: JumbleGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

export default function JumbleGame({ question, assistLevel, onComplete }: JumbleGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order. Index-based (not value-based as
  // the Dart `contains` was) so each button is used once even with duplicate labels.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<OrderedSelectionResult | null>(null);

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
    const outcome = evaluateOrderedSelection(
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
        Problem text — hover-translate is always available. The rest of the
        assist card (speak-question, translate/auto-translate) is gated by
        assistLevel, mirroring the Dart `if (assistLevel == novice ||
        intermediate)` wrapper — hidden entirely for advanced/"Low Assist".
      */}
      <div style={{ ...card, textAlign: 'center' }} data-assist-level={assistLevel}>
        <HoverTranslatedText text={question.displayedProblem} profile={p} />
        {assistLevel !== 'advanced' && (
          <>
            {assistLevel === 'novice' && (
              <SpeakQuestionButton text={question.displayedProblem} profile={p} />
            )}
            <TranslateButton
              sourceText={question.displayedProblem}
              profile={p}
              autoTranslate={assistLevel === 'novice'}
            />
          </>
        )}
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
      <AnswerFeedback
        outcome={result}
        wasCleanCorrect={!base.hadMistake}
        profile={p}
        wrongMessage="Try again — that order isn’t quite right."
        incompleteMessage="Please select more answers."
      />
    </section>
  );
}
