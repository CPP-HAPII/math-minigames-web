import type {
  AnyGameData,
  Difficulty,
  FillBlanksGameData,
  JumbleGameData,
  PlaybackGameData,
  ReadAloudGameData,
  TypingGameData,
} from './types';

// ─── Firestore format normalizers ─────────────────────────────────────────────

/**
 * Normalise a raw Firestore multiAcceptedAnswers value into string[][] (nested token arrays).
 * Used for JumbleGameData, PlaybackGameData, and ReadAloudGameData.
 *
 * Ported verbatim from _normalizeNestedAnswers() in lib/pages/game_data.dart.
 *
 * Handles four Firestore storage formats:
 *
 *   1. JSON string  – value is a string that parses as JSON, e.g. '["a b","c d"]'
 *                     or '[["a","b"],["c","d"]]'. Decoded and re-normalised.
 *
 *   2. string[] — all elements are single tokens (no whitespace):
 *                     The entire array represents ONE accepted answer's token list.
 *                     Wrapped in an outer array: [asStrings].
 *                     Example: ["six"] → [["six"]]
 *
 *   3. string[] — at least one element contains whitespace (i.e. is a phrase):
 *                     Each element is treated as a separate accepted-answer phrase
 *                     and split on whitespace into its own token array.
 *                     Example: ["she is forty", "she was forty"] → [["she","is","forty"], ["she","was","forty"]]
 *
 *   4. Array of arrays — each inner array is mapped to string[].
 *                     Example: [["a","b"],["c","d"]] → [["a","b"],["c","d"]]
 */
export function normalizeNestedAnswers(value: unknown): string[][] {
  if (value == null) return [];

  // Format 1: JSON string
  if (typeof value === 'string') {
    try {
      const decoded: unknown = JSON.parse(value);
      if (Array.isArray(decoded)) return normalizeNestedAnswers(decoded);
    } catch {
      // not valid JSON – fall through to plain-string handling
    }
    // Plain string: treat as one answer, tokenise on whitespace
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    return tokens.length > 0 ? [tokens] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [];

    // Format 4: array of arrays
    if (Array.isArray(value[0])) {
      return (value as unknown[][]).map((inner) => inner.map(String));
    }

    // Formats 2 & 3: array of strings
    const asStrings = (value as unknown[]).map(String);
    const anyHasSpace = asStrings.some((s) => /\s+/.test(s.trim()));

    if (anyHasSpace) {
      // Format 3: each element is a phrase → split each into tokens
      return asStrings.map((s) =>
        s
          .trim()
          .split(/\s+/)
          .filter(Boolean),
      );
    } else {
      // Format 2: all single tokens → whole list = tokens for one answer
      return [asStrings];
    }
  }

  // Fallback: coerce to string and tokenise
  return [String(value).split(/\s+/).filter(Boolean)];
}

/**
 * Normalise a raw Firestore value into string[] (flat list of complete strings).
 * Used for TypingGameData and FillBlanksGameData where each element is a full
 * answer string, NOT a token to be assembled into a phrase.
 *
 * Ported verbatim from _normalizeToStringList() in lib/pages/game_data.dart.
 */
export function normalizeToStringList(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const decoded: unknown = JSON.parse(value);
      if (Array.isArray(decoded)) return (decoded as unknown[]).map(String);
    } catch {
      // not JSON
    }
    return [value];
  }
  if (Array.isArray(value)) return (value as unknown[]).map(String);
  return [String(value)];
}

// ─── Type key resolution ──────────────────────────────────────────────────────

/**
 * Determine which game type a raw Firestore question document represents.
 * Ported verbatim from _resolveQuestionTypeKey() in lib/pages/game_data.dart.
 *
 * Resolution order (highest to lowest priority):
 *   1. 'id' field prefix   (e.g. "jumble.1" → 'jumble')
 *   2. 'type' field value  (e.g. "JumbleGameData" → 'jumble')
 *   3. 'gameType' field    (e.g. "Jumble" or "jumble" → 'jumble')
 *   4. Field-presence fallbacks (last resort)
 *
 * All string comparisons are lowercased before matching.
 * The JSON seed file uses PascalCase for both 'type' and 'gameType'
 * (e.g. "ReadAloud", "FillBlanks") — lowercasing handles this transparently.
 *
 * Returns: 'jumble' | 'playback' | 'reading' | 'typing' | 'fill' | '' (unknown)
 */
export function resolveQuestionTypeKey(doc: Record<string, unknown>): string {
  const id = String(doc['id'] ?? '').toLowerCase();
  const type = String(doc['type'] ?? '').toLowerCase();
  const gameType = String(doc['gameType'] ?? '').toLowerCase();

  if (
    id.startsWith('jumble') ||
    type === 'jumblegamedata' ||
    gameType === 'jumble'
  )
    return 'jumble';

  if (
    id.startsWith('playback') ||
    type === 'playbackgamedata' ||
    gameType === 'playback'
  )
    return 'playback';

  if (
    id.startsWith('reading') ||
    type === 'readaloudgamedata' ||
    gameType === 'readaloud' ||
    gameType === 'read_aloud'
  )
    return 'reading';

  if (
    id.startsWith('typing') ||
    type === 'typinggamedata' ||
    gameType === 'typing'
  )
    return 'typing';

  if (
    id.startsWith('fill') ||
    type === 'fillblanksgamedata' ||
    gameType === 'fillblanks' ||
    gameType === 'fill_blanks'
  )
    return 'fill';

  // Field-presence fallbacks (same order as Dart)
  if ('webAudioLink' in doc) return 'playback';
  if ('blankForm' in doc || 'blankform' in doc) return 'fill';
  if ('displayedProblem' in doc && 'optionList' in doc) return 'jumble';
  if ('displayedProblem' in doc && 'multiAcceptedAnswers' in doc) return 'reading';

  return '';
}

// ─── Answer comparison normalizer ─────────────────────────────────────────────

/**
 * Normalise a string for answer comparison in the Jumble game.
 * Ported from GameFormState._normalizeComparisonString() in lib/pages/activities/jumble.dart.
 *
 * Steps (in order):
 *   1. Lowercase the entire string.
 *   2. Strip all punctuation except hyphens (keep 'forty-eight', 'years-old' intact).
 *   3. Remove the standalone word 'and' (common in written numbers: "four hundred and twenty").
 *   4. Collapse all runs of whitespace to a single space and trim.
 *
 * Used so that "four hundred and fifty three" == "four hundred fifty three",
 * and "years-old" == "years-old" but "years.old" != "years-old".
 */
export function normalizeComparisonString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // strip punctuation, preserve hyphens
    .replace(/\band\b/g, ' ') // remove standalone 'and'
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

// ─── Ordered word-button selection validation ─────────────────────────────────
//
// Shared by JumbleGame and PlaybackGame: both present a word-button palette
// over nested (string[][]) multiAcceptedAnswers and validate the picked order
// identically. Ported from GameFormState.validateAnswer() in jumble.dart;
// playback.dart's PlaybackGameFormState.validateAnswer() is the same
// algorithm (it just returns an int mismatch-index instead of a string enum).

/** The three validation outcomes for an ordered, button-selected answer. */
export type OrderedSelectionResult = 'incomplete' | 'wrong' | 'correct';

/**
 * Validate an ordered token selection against nested accepted answers.
 *
 *   1. Lenient whole-phrase match (normalized join) — accepts even when fewer
 *      buttons than maxSelection are picked, e.g. a button combining tokens.
 *   2. Fewer than maxSelection tokens picked → incomplete.
 *   3. Ordered token-wise exact match against any accepted answer → correct.
 *   4. Otherwise → wrong.
 */
export function evaluateOrderedSelection(
  selected: string[],
  answers: string[][],
  maxSelection: number,
): OrderedSelectionResult {
  const normSelected = normalizeComparisonString(selected.join(' '));
  for (const answer of answers) {
    if (normalizeComparisonString(answer.join(' ')) === normSelected) return 'correct';
  }

  if (selected.length < maxSelection) return 'incomplete';

  for (const answer of answers) {
    if (
      answer.length === selected.length &&
      answer.every((token, i) => token === selected[i])
    ) {
      return 'correct';
    }
  }

  return 'wrong';
}

// ─── Per-type document parsers ────────────────────────────────────────────────
//
// These mirror the fromFirestore() factory constructors in game_data.dart.
// Default score values by type: jumble=10, playback=25, reading=30, typing=20, fill=15.
// The JSON seed file has no 'score' field on any question — defaults apply to all.

function parseDifficulty(raw: unknown): Difficulty {
  const d = String(raw ?? '').toLowerCase();
  if (d === 'easy' || d === 'intermediate' || d === 'hard' || d === 'random') {
    return d;
  }
  return 'easy'; // safe default; JSON uses PascalCase ("Easy") → lowercased above
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map(String);
}

/** 0 when absent/non-numeric — questions that predate the levels/sublevels migration. */
function parseLevel(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** '' when absent — questions that predate the levels/sublevels migration. */
function parseSublevel(raw: unknown): string {
  return String(raw ?? '');
}

function parseJumble(doc: Record<string, unknown>): JumbleGameData {
  return {
    gameType: 'jumble',
    id: String(doc['id'] ?? 'jumble'),
    score: Number(doc['score'] ?? 10),
    skills: parseStringArray(doc['skills']),
    tags: parseStringArray(doc['tags']),
    difficulty: parseDifficulty(doc['difficulty']),
    level: parseLevel(doc['level']),
    sublevel: parseSublevel(doc['sublevel']),
    displayedProblem: String(doc['displayedProblem'] ?? ''),
    multiAcceptedAnswers: normalizeNestedAnswers(doc['multiAcceptedAnswers']),
    writtenPrompt: String(
      doc['writtenPrompt'] ?? 'Use the buttons below to answer the prompt',
    ),
    optionList: parseStringArray(doc['optionList']),
  };
}

function parsePlayback(doc: Record<string, unknown>): PlaybackGameData {
  return {
    gameType: 'playback',
    id: String(doc['id'] ?? 'playback'),
    score: Number(doc['score'] ?? 25),
    skills: parseStringArray(doc['skills']),
    tags: parseStringArray(doc['tags']),
    difficulty: parseDifficulty(doc['difficulty']),
    level: parseLevel(doc['level']),
    sublevel: parseSublevel(doc['sublevel']),
    webAudioLink: String(doc['webAudioLink'] ?? ''),
    audioTranscript: String(doc['audioTranscript'] ?? ''),
    multiAcceptedAnswers: normalizeNestedAnswers(doc['multiAcceptedAnswers']),
    writtenPrompt: String(doc['writtenPrompt'] ?? ''),
    optionList: parseStringArray(doc['optionList']),
  };
}

function parseReadAloud(doc: Record<string, unknown>): ReadAloudGameData {
  // Handle both spellings: 'additionalInstructions' (correct) and
  // 'addtionalInstructions' (typo present in some Firestore documents).
  const additionalInstructions = String(
    doc['additionalInstructions'] ??
      doc['addtionalInstructions'] ??
      'Your speech will be turned into numbers. Make sure you have microphone access enabled.',
  );

  // useNumWordProtocol: boolean in Dart, absent from JSON seed → defaults to true.
  const rawUse = doc['useNumWordProtocol'];
  const useNumWordProtocol =
    rawUse === undefined || rawUse === null ? true : Boolean(rawUse);

  return {
    gameType: 'reading',
    id: String(doc['id'] ?? 'reading'),
    score: Number(doc['score'] ?? 30),
    skills: parseStringArray(doc['skills']),
    tags: parseStringArray(doc['tags']),
    difficulty: parseDifficulty(doc['difficulty']),
    level: parseLevel(doc['level']),
    sublevel: parseSublevel(doc['sublevel']),
    displayedProblem: String(doc['displayedProblem'] ?? ''),
    multiAcceptedAnswers: normalizeNestedAnswers(doc['multiAcceptedAnswers']),
    writtenPrompt: String(
      doc['writtenPrompt'] ??
        'Answer the question by speaking into the microphone.',
    ),
    additionalInstructions,
    useNumWordProtocol,
  };
}

function parseTyping(doc: Record<string, unknown>): TypingGameData {
  return {
    gameType: 'typing',
    id: String(doc['id'] ?? 'typing'),
    score: Number(doc['score'] ?? 20),
    skills: parseStringArray(doc['skills']),
    tags: parseStringArray(doc['tags']),
    difficulty: parseDifficulty(doc['difficulty']),
    level: parseLevel(doc['level']),
    sublevel: parseSublevel(doc['sublevel']),
    displayedProblem: String(doc['displayedProblem'] ?? ''),
    // Flat string[] — one complete answer string per element. NOT normalizeNestedAnswers.
    multiAcceptedAnswers: normalizeToStringList(doc['multiAcceptedAnswers']),
    writtenPrompt: String(
      doc['writtenPrompt'] ??
        'Write the expression in written form (do not use special characters)',
    ),
  };
}

function parseFillBlanks(doc: Record<string, unknown>): FillBlanksGameData {
  // Handle both key casings: 'blankForm' and 'blankform'.
  const blankForm = String(doc['blankForm'] ?? doc['blankform'] ?? '');
  return {
    gameType: 'fill',
    id: String(doc['id'] ?? 'fill'),
    score: Number(doc['score'] ?? 15),
    skills: parseStringArray(doc['skills']),
    tags: parseStringArray(doc['tags']),
    difficulty: parseDifficulty(doc['difficulty']),
    level: parseLevel(doc['level']),
    sublevel: parseSublevel(doc['sublevel']),
    displayedProblem: String(doc['displayedProblem'] ?? ''),
    // Flat string[] — element[i] is the correct answer for blank[i]. NOT normalizeNestedAnswers.
    multiAcceptedAnswers: normalizeToStringList(doc['multiAcceptedAnswers']),
    writtenPrompt: String(doc['writtenPrompt'] ?? ''),
    blankForm,
    optionList: parseStringArray(doc['optionList']),
  };
}

/**
 * Parse a raw Firestore question document into a fully-typed AnyGameData object.
 * Returns null if resolveQuestionTypeKey cannot determine the type.
 */
export function parseQuestion(doc: Record<string, unknown>): AnyGameData | null {
  const key = resolveQuestionTypeKey(doc);
  switch (key) {
    case 'jumble':
      return parseJumble(doc);
    case 'playback':
      return parsePlayback(doc);
    case 'reading':
      return parseReadAloud(doc);
    case 'typing':
      return parseTyping(doc);
    case 'fill':
      return parseFillBlanks(doc);
    default:
      return null;
  }
}
