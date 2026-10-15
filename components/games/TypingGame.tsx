'use client';

import { useState } from 'react';
import { useHydrated } from '@/lib/hooks/useHydrated';
import type { AssistLevel, TypingGameData } from '@/lib/types';
import { normalizeComparisonString } from '@/lib/normalize';
import { useThemeStore, selectActiveProfile } from '@/lib/stores/themeStore';
import { themes } from '@/lib/themes';
import { useGameBase } from '@/lib/hooks/useGameBase';
import styles from './TaskLayout.module.css';
import AnswerFeedback from './AnswerFeedback';
import { AnswerPanel, QuestionCard } from './TaskPanels';

interface TypingGameProps {
  question: TypingGameData;
  /** Language assist controls are rendered by the parent TaskLayout. */
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

export default function TypingGame({ question, onComplete }: TypingGameProps) {
  const base = useGameBase(question.score);

  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);

  const solved = result === 'correct';
  const locked = solved || result === 'wrong';

  // Theme — guard hydration so SSR uses the default profile (matches other pages).
  const profile = useThemeStore(selectActiveProfile);
  const hydrated = useHydrated();
  const p = hydrated ? profile : themes[0];

  function handleChange(value: string) {
    if (locked) return;
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
      onComplete(false);
    }
  }

  const checkDisabled = typed.trim().length === 0 || locked;

  return (
    <>
      <QuestionCard instruction={question.writtenPrompt} text={question.displayedProblem} profile={p} />
      <AnswerPanel
        onClear={() => handleChange('')} onCheck={handleCheck} clearDisabled={typed.length === 0 || locked} checkDisabled={checkDisabled}
        feedback={<AnswerFeedback outcome={result} wasCleanCorrect={!base.hadMistake} profile={p} wrongMessage="Try again — that isn’t quite right." />}
      >
        <div>
          <label htmlFor="typing-answer" className={styles.inputLabel}>Your answer</label>
          <textarea
            id="typing-answer" className={styles.textInput} value={typed} onChange={(e) => handleChange(e.target.value)}
            disabled={locked} rows={3} placeholder="Type your answer…"
          />
        </div>
      </AnswerPanel>
    </>
  );
}
