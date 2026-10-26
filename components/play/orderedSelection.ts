import { evaluateOrderedSelection, normalizeComparisonString, type OrderedSelectionResult } from '@/lib/normalize';

/**
 * True when `selected` could still grow into one of the accepted answers.
 * Compared as normalized whole phrases, word for word from the start, so a
 * block that holds a compound ("seventy-seven") still matches an answer
 * written as separate tokens ("seventy", "seven").
 */
export function isPossiblePrefix(selected: string[], accepted: string[][]): boolean {
  const picked = normalizeComparisonString(selected.join(' '));
  if (picked === '') return true;
  return accepted.some((answer) => {
    const full = normalizeComparisonString(answer.join(' '));
    return full === picked || full.startsWith(`${picked} `);
  });
}

/**
 * evaluateOrderedSelection, with one fix: it reports 'incomplete' for ANY short
 * selection, so "Her sister" for "Her brother picked…" got "Please select more
 * answers" even though no amount of extra blocks could make it right. A short
 * selection stays 'incomplete' only while it is still a valid start; one that
 * already contradicts every accepted answer is 'wrong'.
 */
export function checkOrderedSelection(
  selected: string[],
  accepted: string[][],
  maxSelection: number,
): OrderedSelectionResult {
  const result = evaluateOrderedSelection(selected, accepted, maxSelection);
  if (result === 'incomplete' && !isPossiblePrefix(selected, accepted)) return 'wrong';
  return result;
}
