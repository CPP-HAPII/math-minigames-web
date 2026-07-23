'use client';

import { useEffect, useState } from 'react';
import type { AssistLevel, FillBlanksGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import AnswerFeedback from './AnswerFeedback';
import TranslateButton from './TranslateButton';
import HoverTranslatedText from './HoverTranslatedText';
import SpeakQuestionButton from './SpeakQuestionButton';

interface FillBlanksGameProps {
  question: FillBlanksGameData;
  /** Current language-assist level. Wired into the assist UI in Stages 12–14. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

/** Validation outcomes. Mirrors Jumble's three UI states for an identical contract. */
type CheckResult = 'incomplete' | 'wrong' | 'correct';

/**
 * Validate the filled-in blanks against the accepted answers.
 * Ported from GameFormState.validateAnswer() in fill_in_the_blank.dart, with the
 * normalization the task calls for (Dart used a raw `!=` string compare):
 *
 *   FillBlanksGameData.multiAcceptedAnswers is a FLAT string[] (via
 *   normalizeToStringList) — element[i] is the COMPLETE answer for blank[i].
 *   Several answers are multi-word phrases ("hundred thousands", "ten thousandths").
 *   Compare each filled blank against its accepted answer as a WHOLE phrase with
 *   normalizeComparisonString — never split a multi-word answer into tokens.
 */
function evaluateFill(
  filled: string[],
  answers: string[],
  maxSelection: number,
): CheckResult {
  // Dart: currentCount < maxSelectedAnswers → not enough filled.
  if (filled.length < maxSelection) return 'incomplete';

  // maxSelection === answers.length (getMinSelection), and filled is capped at it.
  for (let i = 0; i < answers.length; i++) {
    if (normalizeComparisonString(filled[i] ?? '') !== normalizeComparisonString(answers[i])) {
      return 'wrong';
    }
  }
  return 'correct';
}

/** One rendered piece of the blank-form sentence. */
type Piece =
  | { kind: 'text'; value: string }
  | { kind: 'filled'; value: string }
  | { kind: 'empty'; value: string };

/**
 * Reconstruct blankForm with the selected answers dropped into the blanks,
 * left-to-right. Ported from renderConditionalLabels(): split on spaces, and
 * any word containing '_' is a blank filled by the next selected answer.
 */
function renderPieces(blankForm: string, filled: string[]): Piece[] {
  const pieces: Piece[] = [];
  let blankIndex = 0;
  for (const word of blankForm.split(' ')) {
    if (word.includes('_')) {
      if (blankIndex < filled.length) {
        pieces.push({ kind: 'filled', value: filled[blankIndex] });
      } else {
        pieces.push({ kind: 'empty', value: word });
      }
      blankIndex += 1;
    } else if (word.length > 0) {
      pieces.push({ kind: 'text', value: word });
    }
  }
  return pieces;
}

export default function FillBlanksGame({ question, assistLevel, onComplete }: FillBlanksGameProps) {
  // getMinSelection() = multiAcceptedAnswers.length — the number of blanks to fill.
  const maxSelection = question.multiAcceptedAnswers.length;

  const base = useGameBase(question.score);

  // Selected option labels, in fill order (one per blank). Buttons are reusable
  // (NOT disabled) — faithful to the Dart, where answers can repeat (e.g. fill.7).
  const [filled, setFilled] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);

  const solved = result === 'correct';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const p = hydrated ? profile : themes[0];

  function handleSelect(option: string) {
    if (solved) return;
    setFilled((prev) => (prev.length >= maxSelection ? prev : [...prev, option])); // cap at #blanks
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (solved) return;
    setFilled([]);
    setResult(null);
  }

  function handleCheck() {
    const outcome = evaluateFill(filled, question.multiAcceptedAnswers, maxSelection);
    setResult(outcome);

    if (outcome === 'correct') {
      // Ports `isCorrect = !madeMistake`: solving after a wrong attempt is not a clean correct.
      onComplete(base.wasCleanCorrect());
    } else if (outcome === 'wrong') {
      base.markMistake();
    }
    // 'incomplete' → just prompt to fill the remaining blanks (no mistake, matches Jumble).
  }

  const pieces = renderPieces(question.blankForm, filled);

  // ── Styles (shared look with JumbleGame / TypingGame) ───────────────────────
  const card: React.CSSProperties = {
    backgroundColor: p.headerColor,
    borderRadius: '1rem',
    padding: '1.25rem 1.5rem',
    margin: '0.75rem auto',
    maxWidth: '760px',
    width: '100%',
  };

  const optionButton = (disabled: boolean): React.CSSProperties => ({
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

  const actionsDisabled = filled.length === 0 || solved;

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
      {/* Instruction — hardcoded in the Dart for this game. */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: p.contrastTextColor }}>
          Use the blocks below to form the written form of the expression:
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

      {/* Your answer — blankForm with the picked answers dropped into the blanks. */}
      <div style={{ ...card, textAlign: 'center' }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.75rem', color: p.contrastTextColor }}>
          Your answer
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.5rem', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', color: p.contrastTextColor }}>
          {pieces.map((piece, i) => {
            if (piece.kind === 'filled') {
              return (
                <span
                  key={i}
                  style={{
                    backgroundColor: p.buttonColor,
                    color: p.textColor,
                    borderRadius: '0.4rem',
                    padding: '0.1rem 0.55rem',
                    fontWeight: 600,
                  }}
                >
                  {piece.value}
                </span>
              );
            }
            if (piece.kind === 'empty') {
              return (
                <span key={i} style={{ opacity: 0.6, letterSpacing: '0.1em' }}>
                  ____
                </span>
              );
            }
            return <span key={i}>{piece.value}</span>;
          })}
        </div>
      </div>

      {/* Option-button palette (reusable — not disabled until solved). */}
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
        {question.optionList.map((option, i) => (
          <button key={i} onClick={() => handleSelect(option)} disabled={solved} style={optionButton(solved)}>
            {option}
          </button>
        ))}
      </div>

      {/* Actions. */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button onClick={handleCheck} disabled={actionsDisabled} style={actionButton(p.checkAnswerButtonColor, actionsDisabled)}>
          Check Answer
        </button>
        <button onClick={handleClear} disabled={actionsDisabled} style={actionButton(p.clearAnswerButtonColor, actionsDisabled)}>
          Clear
        </button>
      </div>

      {/* Feedback. */}
      <AnswerFeedback
        outcome={result}
        wasCleanCorrect={!base.hadMistake}
        profile={p}
        wrongMessage="Try again — that isn’t quite right."
        incompleteMessage="Fill in all the blanks first."
      />
    </section>
  );
}
