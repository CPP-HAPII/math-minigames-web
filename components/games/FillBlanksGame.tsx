'use client';

import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';
import type { AssistLevel, FillBlanksGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import styles from './TaskLayout.module.css';
import AnswerFeedback from './AnswerFeedback';
import { AnswerPanel, QuestionCard, WordChoices } from './TaskPanels';

interface FillBlanksGameProps {
  question: FillBlanksGameData;
  /** Language assist controls are rendered by the parent TaskLayout. */
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

export default function FillBlanksGame({ question, onComplete }: FillBlanksGameProps) {
  // getMinSelection() = multiAcceptedAnswers.length — the number of blanks to fill.
  const maxSelection = question.multiAcceptedAnswers.length;

  const base = useGameBase(question.score);

  // Selected option labels, in fill order (one per blank). Buttons are reusable
  // (NOT disabled) — faithful to the Dart, where answers can repeat (e.g. fill.7).
  const [filled, setFilled] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);

  const solved = result === 'correct';
  const locked = solved || result === 'wrong';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  function handleSelect(option: string) {
    if (locked) return;
    setFilled((prev) => (prev.length >= maxSelection ? prev : [...prev, option])); // cap at #blanks
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (locked) return;
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
      onComplete(false);
    }
    // 'incomplete' → just prompt to fill the remaining blanks (no mistake, matches Jumble).
  }

  const pieces = renderPieces(question.blankForm, filled);

  const actionsDisabled = filled.length === 0 || locked;

  return (
    <>
      <QuestionCard instruction={question.writtenPrompt || 'Use the blocks below to form the written form of the expression:'} text={question.displayedProblem} profile={p} />
      <AnswerPanel
        onClear={handleClear} onCheck={handleCheck} clearDisabled={actionsDisabled} checkDisabled={actionsDisabled}
        feedback={<AnswerFeedback outcome={result} wasCleanCorrect={!base.hadMistake} profile={p}
          wrongMessage="Try again — that isn’t quite right." incompleteMessage="Fill in all the blanks first." />}
      >
        <div className={styles.answerArea} aria-label="Your answer" aria-live="polite">
          <p>
            {pieces.map((piece, i) => (
              <span key={i}>
                <span className={piece.kind === 'empty' ? styles.blank : piece.kind === 'filled' ? styles.filledBlank : undefined}>{piece.value}</span>{' '}
              </span>
            ))}
          </p>
        </div>
        <WordChoices options={question.optionList} locked={locked} onSelect={(index) => handleSelect(question.optionList[index])} />
      </AnswerPanel>
    </>
  );
}
