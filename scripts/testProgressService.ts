/**
 * scripts/testProgressService.ts
 *
 * Runs lib/services/progressService.ts against synthetic data — no
 * Firestore, no seeded data required, since computeContinueTarget /
 * computeSublevelProgress are pure functions over a bank + rows passed in.
 * Exercises the scenarios called out before wiring Continue into any UI:
 * nothing started, one sublevel in-progress, one sublevel just completed,
 * and jumping around non-sequentially — plus two edge cases (multiple
 * in-progress sublevels, everything complete).
 *
 * Run from the math-minigames-web project root:
 *   npx tsx scripts/testProgressService.ts
 */

import { computeContinueTarget, computeSublevelProgress } from '../lib/services/progressService';
import type { AnyGameData } from '../lib/types';
import type { QuestionAttemptRow } from '../lib/services/analyticsDataService';

// ── Synthetic question bank: 3 sublevels across 2 levels ──────────────────
// 1.1 (level 1): 3 questions   1.2 (level 1): 2 questions   2.1 (level 2): 2 questions
function q(id: string, level: number, sublevel: string): AnyGameData {
  return {
    id,
    skills: [],
    score: 10,
    tags: [],
    gameType: 'typing',
    difficulty: 'easy',
    level,
    sublevel,
    displayedProblem: '',
    multiAcceptedAnswers: [],
    writtenPrompt: '',
  };
}

const bank: AnyGameData[] = [
  q('1.1-P1', 1, '1.1'),
  q('1.1-P2', 1, '1.1'),
  q('1.1-P3', 1, '1.1'),
  q('1.2-P1', 1, '1.2'),
  q('1.2-P2', 1, '1.2'),
  q('2.1-P1', 2, '2.1'),
  q('2.1-P2', 2, '2.1'),
];

let attemptCounter = 0;
function row(userId: string, questionId: string, submissionTime: Date): QuestionAttemptRow {
  attemptCounter++;
  return {
    userId,
    attemptId: `attempt-${attemptCounter}`,
    submissionTime,
    difficulty: 'easy',
    questionId,
    skills: [],
    result: true,
    timeTakenInSeconds: 5,
    assistUsed: null,
    assistInteractions: [],
  };
}

const T = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);

// ── Scenarios ───────────────────────────────────────────────────────────────

const scenarios: { name: string; rows: QuestionAttemptRow[] }[] = [
  {
    name: 'A. Nothing started',
    rows: [],
  },
  {
    name: 'B. One sublevel in-progress (1.1: 2 of 3 answered)',
    rows: [
      row('studentB', '1.1-P1', T(2)),
      row('studentB', '1.1-P2', T(1)),
    ],
  },
  {
    name: 'C. One sublevel just completed (1.1: all 3 answered)',
    rows: [
      row('studentC', '1.1-P1', T(3)),
      row('studentC', '1.1-P2', T(2)),
      row('studentC', '1.1-P3', T(1)),
    ],
  },
  {
    name: 'D. Jumping around non-sequentially (2.1 completed first, then 1.1 started — in-progress wins over order)',
    rows: [
      row('studentD', '2.1-P1', T(5)),
      row('studentD', '2.1-P2', T(4)),
      row('studentD', '1.1-P1', T(1)),
    ],
  },
  {
    name: 'E. Multiple sublevels in-progress at once (1.1 touched earlier, 2.1 touched more recently)',
    rows: [
      row('studentE', '1.1-P1', T(3)),
      row('studentE', '2.1-P1', T(1)),
    ],
  },
  {
    name: 'F. Everything complete (no next sublevel exists)',
    rows: [
      row('studentF', '1.1-P1', T(6)),
      row('studentF', '1.1-P2', T(6)),
      row('studentF', '1.1-P3', T(6)),
      row('studentF', '1.2-P1', T(4)),
      row('studentF', '1.2-P2', T(4)),
      row('studentF', '2.1-P1', T(2)),
      row('studentF', '2.1-P2', T(2)),
    ],
  },
  {
    name: 'G. Skip-ahead, nothing in progress (2.1 completed, 1.1/1.2 never touched — earlier gap wins over sequence_complete)',
    rows: [
      row('studentG', '2.1-P1', T(2)),
      row('studentG', '2.1-P2', T(2)),
    ],
  },
  {
    name: 'H. Everything complete except one early gap (1.2 and 2.1 done, 1.1 untouched)',
    rows: [
      row('studentH', '1.2-P1', T(4)),
      row('studentH', '1.2-P2', T(4)),
      row('studentH', '2.1-P1', T(2)),
      row('studentH', '2.1-P2', T(2)),
    ],
  },
];

for (const { name, rows } of scenarios) {
  console.log(`\n=== ${name} ===`);
  console.log('Sublevel progress:', JSON.stringify(computeSublevelProgress(rows, bank)));
  console.log('Continue target:  ', JSON.stringify(computeContinueTarget(rows, bank)));
}
