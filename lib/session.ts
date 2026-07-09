import type { AnyGameData, Difficulty, GameType, SequenceData } from './types';

/**
 * Game types with a working component as of Stage 9. Playback (Stage 11) and
 * ReadAloud (Stage 14) questions are excluded from the series pool entirely
 * rather than rendered as a placeholder: every game in this series advances
 * the series via the onComplete(wasCorrect) contract, which requires the
 * player to actually solve the question. A placeholder can't produce that
 * callback, so it would either dead-end the series or need a fake "skip"
 * that doesn't exist anywhere else in this flow. Filtering the pool is the
 * option that keeps the state machine's only entry point (onComplete)
 * meaningful. Stage 11/14 only need to add their game type to this array and
 * a render branch in PlayContent — the selection/session logic doesn't change.
 */
export const SUPPORTED_GAME_TYPES: readonly GameType[] = ['jumble', 'typing', 'fill'];

/** Number of questions in a 'random' difficulty series. Mirrors SeriesHomePage(maxQuestCount: 10) in game_series.dart. */
const RANDOM_SERIES_LENGTH = 10;

/**
 * Maps internal Difficulty keys to the label strings sequenceDoc.json stores
 * ("Easy" / "Medium" / "Hard" — PascalCase UI labels, not lowercased at read
 * time; see parseSequence() in gameDataStore.ts). This is the same UI-label
 * <-> data-key mapping app/home/page.tsx's DIFFICULTIES array already applies
 * once for display ("Medium" -> 'intermediate'); here it's applied again so a
 * chosen difficulty can be matched against SequenceData.difficulty entries.
 */
const DIFFICULTY_SEQUENCE_LABEL: Record<'easy' | 'intermediate' | 'hard', string> = {
  easy: 'Easy',
  intermediate: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_BANK_KEY = {
  easy: 'easyBank',
  intermediate: 'intermediateBank',
  hard: 'hardBank',
} as const;

interface DifficultyBanks {
  easyBank: AnyGameData[];
  intermediateBank: AnyGameData[];
  hardBank: AnyGameData[];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build the ordered question pool for a play session.
 *
 * difficulty === 'random': pools all three difficulty banks together, shuffles,
 *   and caps at RANDOM_SERIES_LENGTH — mirrors Dart's DifficultyType.random path
 *   (selectRandPages()), which ignores sequence/difficulty filtering entirely.
 *
 * difficulty !== 'random': maps the difficulty to its sequenceDoc label (see
 *   DIFFICULTY_SEQUENCE_LABEL) and confirms a sequence declares that label
 *   (warns if not — gameDataStore's easyBank/intermediateBank/hardBank are the
 *   same partition sequenceDoc's "Easy/Medium/Hard Sequence" entries describe,
 *   so the bank is used either way). No shuffle — matches the Dart fixed-series
 *   path, which walks the bank in its existing order.
 *
 * `category`, when non-empty, restricts to questions whose `skills` array
 * contains it — this is the SKILL_MAP-keyed grid on the home page. Sequence
 * `filters` (topic tags like "addition", a coarser taxonomy than `skills`)
 * aren't reachable from that grid, so they're not applied as a hard filter
 * here; they remain on `sequences` for a future topic-sequence picker.
 *
 * Playback/ReadAloud questions are always excluded — see SUPPORTED_GAME_TYPES.
 */
export function selectSeriesQuestions(
  banks: DifficultyBanks,
  sequences: SequenceData[],
  category: string,
  difficulty: Difficulty,
): AnyGameData[] {
  let pool: AnyGameData[];

  if (difficulty === 'random') {
    pool = [...banks.easyBank, ...banks.intermediateBank, ...banks.hardBank];
  } else {
    const label = DIFFICULTY_SEQUENCE_LABEL[difficulty];
    const hasSequence = sequences.some((s) => s.difficulty.includes(label));
    if (!hasSequence) {
      console.warn(`[session] No sequence in sequenceDoc declares difficulty label "${label}".`);
    }
    pool = banks[DIFFICULTY_BANK_KEY[difficulty]];
  }

  pool = pool.filter((q) => SUPPORTED_GAME_TYPES.includes(q.gameType));

  if (category) {
    pool = pool.filter((q) => q.skills.includes(category));
  }

  if (difficulty === 'random') {
    pool = shuffle(pool).slice(0, RANDOM_SERIES_LENGTH);
  }

  return pool;
}
