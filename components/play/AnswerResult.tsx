'use client';

import { useEffect, useRef } from 'react';
import AnswerFeedback from '@/components/games/AnswerFeedback';
import { useActiveProfile, usePlayTokens } from '@/lib/usePlayTokens';

export type PlayOutcome = 'correct' | 'wrong' | 'incomplete' | null;

interface AnswerResultProps {
  outcome: PlayOutcome;
  /** Shown for 'wrong': the formatted correct answer (see lib/formatCorrectAnswer). */
  correctAnswer: string;
  /** Shown for 'incomplete'. */
  incompleteMessage?: string;
  /** Called by "Next question" after a wrong answer. */
  onNext: () => void;
}

/**
 * What appears under the answer controls after Check Answer.
 *  - correct:    the existing celebration (AnswerFeedback); the series advances on its own.
 *  - incomplete: a nudge to finish building the answer. Not a mistake.
 *  - wrong:      the question is over. Shows the correct answer and a Next button;
 *                the student isn't asked to guess again here, the question
 *                comes back after the first pass.
 */
export default function AnswerResult({ outcome, correctAnswer, incompleteMessage, onNext }: AnswerResultProps) {
  const t = usePlayTokens();
  const profile = useActiveProfile();
  const nextRef = useRef<HTMLButtonElement>(null);

  // Keyboard users land on the button that moves on.
  useEffect(() => {
    if (outcome === 'wrong') nextRef.current?.focus();
  }, [outcome]);

  if (!outcome) return null;

  if (outcome === 'correct') {
    return <AnswerFeedback outcome="correct" wasCleanCorrect profile={profile} wrongMessage="" />;
  }

  if (outcome === 'incomplete') {
    if (!incompleteMessage) return null;
    return (
      <p role="status" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: t.danger, fontFamily: t.bodyFont }}>
        {incompleteMessage}
      </p>
    );
  }

  return (
    <div
      role="status"
      data-testid="wrong-answer"
      style={{
        background: t.dangerBg,
        border: `1.5px solid ${t.danger}`,
        borderRadius: 16,
        padding: '16px 20px',
        fontFamily: t.bodyFont,
        color: t.questionInk,
      }}
    >
      <p style={{ margin: 0, fontFamily: t.displayFont, fontWeight: 700, fontSize: '1.3rem', color: t.danger }}>Not quite</p>
      {correctAnswer && (
        <p style={{ margin: '8px 0 0', fontSize: '1.1rem', lineHeight: 1.45 }}>
          The correct answer is: <strong data-testid="correct-answer">{correctAnswer}</strong>
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: '1rem', color: t.mutedInk }}>
        We&rsquo;ll bring this question back at the end so you can try it again.
      </p>
      <button
        ref={nextRef}
        type="button"
        onClick={onNext}
        style={{
          marginTop: 14,
          minHeight: 48,
          padding: '8px 26px',
          borderRadius: 14,
          border: 'none',
          background: t.primaryBg,
          color: t.primaryInk,
          boxShadow: `0 3px 10px ${t.primaryShadow}`,
          fontFamily: t.displayFont,
          fontWeight: 700,
          fontSize: '1.2rem',
          cursor: 'pointer',
        }}
      >
        Next question →
      </button>
    </div>
  );
}
