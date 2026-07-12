/**
 * Ported from speech_to_text_helper.dart (convertNumberToWords /
 * convertNumbersAndSymbolsToWords). Used to post-process a Web Speech API
 * transcript before comparing it to ReadAloudGameData.multiAcceptedAnswers,
 * when useNumWordProtocol is true (the default for every seeded Read Aloud
 * question — see parseReadAloud() in lib/normalize.ts). STT engines commonly
 * transcribe spoken numbers as digits ("476"), so this converts any digit
 * run back into its written-word form ("four hundred seventy six") to match
 * the word-form accepted-answer variants.
 *
 * Dart's `useAndPrefix` / `andBelowTwenty` locals in convertNumberToWords are
 * computed but never read anywhere in that file (dead code in the source) —
 * the algorithm that actually runs never emits "and" (105 -> "one hundred
 * five", not "one hundred and five"). That's fine to drop: normalizeComparisonString()
 * already strips a standalone "and" before comparing (see lib/normalize.ts),
 * so this port doesn't need to add it back in either.
 */

const SYMBOL_CONVERSIONS: Record<string, string> = {
  '@': 'at',
  '#': 'hashtag',
  '&': 'and',
  '%': 'percent',
  '$': 'dollar',
  '=': 'equals',
  '+': 'plus',
  '-': 'subtract',
  '/': 'divided by',
  '*': 'times',
  ',': '',
};

const BELOW_TWENTY = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Magnitude words per 3-digit chunk. Same range as the Dart source — numbers >= 10^15 lose their magnitude word. */
const THOUSANDS = ['', 'thousand', 'million', 'billion', 'trillion'];

function convertChunk(num: number): string {
  if (num === 0) return '';
  if (num < 20) return BELOW_TWENTY[num];
  if (num < 100) {
    return TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ` ${BELOW_TWENTY[num % 10]}` : '');
  }
  const hundredsDigit = Math.floor(num / 100);
  const remainder = num % 100;
  return `${BELOW_TWENTY[hundredsDigit]} hundred${remainder !== 0 ? ` ${convertChunk(remainder)}` : ''}`;
}

/** Converts a non-negative integer to its written-word form (e.g. 476 -> "four hundred seventy six"). */
export function convertNumberToWords(number: number): string {
  if (number === 0) return 'zero';

  let n = Math.trunc(Math.abs(number));
  let i = 0;
  let words = '';

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk !== 0) {
      const chunkWords = convertChunk(chunk) + (THOUSANDS[i] ? ` ${THOUSANDS[i]}` : '');
      words = chunkWords + (words ? ` ${words}` : '');
    }
    n = Math.floor(n / 1000);
    i++;
  }

  return words.trim();
}

/**
 * Replaces symbols with their spoken-word equivalents, then digit runs with
 * their written-word form, in that order (matching the Dart source).
 */
export function convertNumbersAndSymbolsToWords(input: string): string {
  let output = input;
  for (const [symbol, word] of Object.entries(SYMBOL_CONVERSIONS)) {
    output = output.replaceAll(symbol, word);
  }
  return output.replace(/\d+/g, (match) => convertNumberToWords(Number(match)));
}
