'use client';

import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';
import type { AssistLevel, JumbleGameData } from '@/lib/types';
import { evaluateOrderedSelection, type OrderedSelectionResult } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import AnswerFeedback from './AnswerFeedback';
import { AnswerPanel, QuestionCard, SelectedWords, WordChoices } from './TaskPanels';

interface JumbleGameProps {
  question: JumbleGameData;
  /** Language assist controls are rendered by the parent TaskLayout. */
  assistLevel: AssistLevel;
  /** Called once the question is solved. wasCorrect = clean correct (no prior wrong attempt). */
  onComplete: (wasCorrect: boolean) => void;
}

export default function JumbleGame({ question, onComplete }: JumbleGameProps) {
  // getMinSelection() = multiAcceptedAnswers[0].length — the max tokens selectable.
  const maxSelection = question.multiAcceptedAnswers[0]?.length ?? 0;

  const base = useGameBase(question.score);

  // Indices into optionList, in selection order. Index-based (not value-based as
  // the Dart `contains` was) so each button is used once even with duplicate labels.
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [result, setResult] = useState<OrderedSelectionResult | null>(null);

  const solved = result === 'correct';
  const locked = solved || result === 'wrong';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  const selectedTokens = selectedIndices.map((i) => question.optionList[i]);

  function handleSelect(i: number) {
    if (locked) return;
    setSelectedIndices((prev) => {
      if (prev.includes(i)) return prev; // each button used once
      if (prev.length >= maxSelection) return prev; // cap at maxSelection (Dart: currentCount < maxSelection)
      return [...prev, i];
    });
    setResult(null); // clear stale feedback when the selection changes
  }

  function handleClear() {
    if (locked) return;
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
      onComplete(false);
    }
    // 'incomplete' → just show the "select more answers" prompt.
  }

  const actionsDisabled = selectedIndices.length === 0 || locked;

  return (
    <>
      <QuestionCard instruction={question.writtenPrompt} text={question.displayedProblem} profile={p} />
      <AnswerPanel
        onClear={handleClear} onCheck={handleCheck} clearDisabled={actionsDisabled} checkDisabled={actionsDisabled}
        feedback={<AnswerFeedback outcome={result} wasCleanCorrect={!base.hadMistake} profile={p}
          wrongMessage="Not quite — here’s the next question." incompleteMessage="Please select more answers." />}
      >
        <SelectedWords tokens={selectedTokens} />
        <WordChoices options={question.optionList} usedIndices={selectedIndices} locked={locked} onSelect={handleSelect} />
      </AnswerPanel>
    </>
  );
}
