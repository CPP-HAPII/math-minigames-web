// Display names for the level/sublevel structure proposed in the levels &
// questions migration. Mirrors the SKILL_MAP pattern: raw `level`/`sublevel`
// values stored on each question document are just a number and a string key
// ("2.2") — this file is the single place that owns their human-readable labels.

/** Level number (1-5) -> display name. */
export const LEVEL_MAP: Record<number, string> = {
  1: 'Foundations',
  2: 'Building Up',
  3: 'Expanding',
  4: 'Advanced Operations',
  5: 'Mastery',
};

/** Sublevel key (e.g. "2.2") -> display name. All 17 sublevels from the levels proposal. */
export const SUBLEVEL_MAP: Record<string, string> = {
  '1.1': 'Addition with Single & Two-Digit Numbers',
  '1.2': 'Multiplication & Division Facts (Single-Digit)',
  '1.3': 'Numbers in Written Form: Two Places',
  '2.1': 'Addition & Subtraction with Three Digits',
  '2.2': 'Numbers in Written Form: Three & Four Places',
  '2.3': 'Time Operations',
  '3.1': 'Addition & Subtraction with Four or More Digits',
  '3.2': 'Understanding Large Numbers (Place Value, 4+ Digits)',
  '3.3': 'Money Operations',
  '3.4': 'Multiplication & Division with Two Digits',
  '4.1': 'Multiplication with Three or More Digits',
  '4.2': 'Division with Three Digits',
  '4.3': 'Understanding Number Sentences',
  '5.1': 'Decimals with Three Places in Written Form',
  '5.2': 'Fraction Handling',
  '5.3': 'Decimals with Two Places in Written Form',
  '5.4': 'Decimals with Three Places in Written Form',
};
