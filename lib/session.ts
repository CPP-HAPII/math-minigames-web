import type { AnyGameData, GameType } from './types';

/** Game types with a working component. */
export const SUPPORTED_GAME_TYPES: readonly GameType[] = ['jumble', 'typing', 'fill', 'playback', 'reading'];

/**
 * Build the ordered question pool for a sublevel-based play session — every
 * question tagged with this sublevel (level/sublevel fields from the
 * levels/sublevels migration), in bank order. A sublevel's question count is
 * small and fixed (~8 today), so unlike the difficulty-based random mode this
 * replaced, there's no shuffle or length cap here.
 */
export function selectSublevelQuestions(bank: AnyGameData[], sublevel: string): AnyGameData[] {
  return bank.filter((q) => q.sublevel === sublevel && SUPPORTED_GAME_TYPES.includes(q.gameType));
}
