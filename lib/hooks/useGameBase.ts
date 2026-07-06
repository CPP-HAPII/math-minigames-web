import { useCallback, useRef, useState } from 'react';

/**
 * Shared per-question game behavior, ported from GamePageState in
 * ../MathMinigamesV2/lib/pages/activities/game_page.dart.
 *
 * Stage 6 scope — kept deliberately light:
 *   • elapsed-time tracking   (Dart: startTime = DateTime.now(); duration in dispose())
 *   • the hadMistake flag      (Dart: madeMistake)
 *   • the score value          (Dart: widget.scoreValue)
 *
 * Deferred to later stages: confetti, success/try-again overlays, and the
 * Firestore / PageDataManager logging that consumes these values.
 */
export interface GameBase {
  /** Points this question is worth (GameData.score). Mirrors widget.scoreValue. */
  score: number;

  /**
   * True once the player has made at least one wrong attempt on this question.
   * Mirrors `madeMistake`. Once set, it stays set for the life of the question.
   */
  hadMistake: boolean;

  /** Record a wrong attempt — flips hadMistake to true. */
  markMistake: () => void;

  /**
   * Whether a correct answer *right now* counts as a clean correct.
   * Ports `isCorrect = !madeMistake`: a question solved only after a wrong
   * attempt does NOT count as a clean correct.
   */
  wasCleanCorrect: () => boolean;

  /**
   * Whole seconds since the question mounted.
   * Ports DateTime.now().difference(startTime).inSeconds.
   */
  elapsedSeconds: () => number;
}

/**
 * @param score points awarded for a clean correct answer to this question.
 *
 * State is tied to the component instance, so callers should remount the game
 * (e.g. a React `key` keyed on the question id) to reset the timer and the
 * hadMistake flag when moving to the next question.
 */
export function useGameBase(score: number): GameBase {
  // Captured once on first render (= mount, since games are client components).
  const startTimeRef = useRef<number>(Date.now());
  const [hadMistake, setHadMistake] = useState(false);

  const markMistake = useCallback(() => setHadMistake(true), []);

  const wasCleanCorrect = useCallback(() => !hadMistake, [hadMistake]);

  const elapsedSeconds = useCallback(
    () => Math.floor((Date.now() - startTimeRef.current) / 1000),
    [],
  );

  return { score, hadMistake, markMistake, wasCleanCorrect, elapsedSeconds };
}
