/**
 * The minimal shape formatCorrectAnswer needs from a question. Kept
 * structural (rather than importing AnyGameData) so it works for every game
 * type without depending on each type's exact multiAcceptedAnswers shape, and
 * so it can be unit-tested with plain objects. AnyGameData satisfies it.
 */
export interface AnswerSource {
  gameType: string;
  multiAcceptedAnswers: unknown;
  /** Only FillBlanks questions have one. */
  blankForm?: unknown;
}

/** A nested answer (Jumble/Playback/ReadAloud token arrays) becomes one spaced string; a flat one passes through. */
function answerToText(answer: unknown): string {
  return Array.isArray(answer) ? answer.map(String).join(' ') : String(answer ?? '');
}

/**
 * Human-readable correct answer for a question, for the "Correct answer"
 * panel and the results breakdown. Always shows the FIRST accepted answer
 * (the other accepted variants are alternate spellings of the same answer).
 *
 * How each game type stores its accepted answers:
 *   jumble / playback / reading  nested token arrays, e.g. [['Her','brother','picked','nine','apples']]
 *   typing                       flat full-answer strings, e.g. ['three plus four equals seven']
 *   fill                         flat, element i is the answer for blank i
 *
 * For fill, the answers are dropped into blankForm so the student sees the
 * finished sentence ("23 + 16 = thirty-nine (write the sum in words)") rather
 * than a bare "thirty-nine". Blanks are found the same way FillBlanksGame
 * finds them: any space-separated word containing '_'. If the blank count and
 * answer count disagree, it falls back to a plain comma-separated list rather
 * than showing a half-filled sentence.
 */
export function formatCorrectAnswer(q: AnswerSource): string {
  const answers = Array.isArray(q.multiAcceptedAnswers) ? q.multiAcceptedAnswers : [];
  if (answers.length === 0) return '';

  if (q.gameType === 'fill' && typeof q.blankForm === 'string') {
    const perBlank = answers.map(answerToText);
    let next = 0;
    const words = q.blankForm
      .split(' ')
      .map((word) => (word.includes('_') ? (perBlank[next++] ?? word) : word));
    return next === perBlank.length ? words.join(' ') : perBlank.join(', ');
  }

  return answerToText(answers[0]);
}
