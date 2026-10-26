'use client';

import { useRef, useState } from 'react';

/** Passed to onComplete so PlayContent can time a question from when it was *answered*, not from when "Next" was clicked. */
export interface CompletionInfo {
  /** Date.now() at the moment Check Answer was pressed. */
  answeredAt: number;
}

export type OnComplete = (wasCorrect: boolean, info?: CompletionInfo) => void;

/**
 * Shared "a wrong answer ends the question" flow for all five games.
 *
 * markWrong() locks the question and starts showing the correct answer;
 * next() reports the miss (wasCorrect = false) once the student has had time to
 * read it. Correct answers don't go through here: they call onComplete(true)
 * straight away and PlayContent holds the screen for a beat before advancing.
 */
export function useQuestionOutcome(onComplete: OnComplete) {
  const [missed, setMissed] = useState(false);
  const answeredAtRef = useRef(0);

  function markWrong() {
    answeredAtRef.current = Date.now();
    setMissed(true);
  }

  function next() {
    onComplete(false, { answeredAt: answeredAtRef.current });
  }

  return { missed, markWrong, next };
}
