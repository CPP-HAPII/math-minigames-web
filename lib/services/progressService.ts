import type { AnyGameData } from '@/lib/types';
import type { QuestionAttemptRow } from './analyticsDataService';

/**
 * Pure computation over an already-fetched question bank (AnyGameData[], see
 * progressDataService.fetchQuestionBank) and one student's already-fetched
 * QuestionAttemptRow[] (see analyticsDataService.fetchStudentQuestionRows) —
 * no Firestore, no fetching. Same split as analyticsService.ts vs
 * analyticsDataService.ts.
 *
 * Every function here expects `rows` already scoped to a single student.
 * Continue is a per-student concept (there is only ever one target), unlike
 * analyticsService's class-wide/per-student dual use.
 *
 * "Answered" means the student has at least one QuestionAttemptRow for that
 * questionId, regardless of whether `result` was correct — sublevel
 * completion tracks exposure/attempt coverage, not mastery.
 *
 * There is no locking in this data model: any level/sublevel can be played
 * regardless of completion elsewhere. Continue is only ever a suggestion.
 */

export type SublevelStatus = 'not_started' | 'in_progress' | 'complete';

export interface SublevelProgress {
  level: number;
  sublevel: string;
  totalQuestions: number;
  answeredQuestions: number;
  status: SublevelStatus;
}

export type ContinueReason =
  /** No sublevel has been touched at all yet. */
  | 'not_started'
  /** An in-progress sublevel exists (started, not finished) — the Continue target regardless of sequence order. */
  | 'in_progress'
  /** Nothing is in progress; target is the earliest not-started sublevel in sequence order, regardless of what's been completed elsewhere (no locking — a later sublevel can be finished while an earlier one is still untouched). */
  | 'next_after_complete'
  /** Every sublevel is complete — there is nothing left to continue to. */
  | 'sequence_complete';

export interface ContinueTarget {
  /** null only when the question bank has no sublevels at all. Even reason 'sequence_complete' still names the last sublevel, so callers always have somewhere to point unless the bank is empty. */
  level: number | null;
  sublevel: string | null;
  reason: ContinueReason;
}

/** Parses a "N.M" sublevel key into numeric parts for correct ordering (string-sort would break past single digits, e.g. "1.10" vs "1.2"). */
function sublevelSortKey(sublevel: string): [number, number] {
  const [a, b] = sublevel.split('.').map(Number);
  return [Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0];
}

function compareSublevels(a: string, b: string): number {
  const [a1, a2] = sublevelSortKey(a);
  const [b1, b2] = sublevelSortKey(b);
  return a1 - b1 || a2 - b2;
}

interface SublevelMeta {
  level: number;
  sublevel: string;
  totalQuestions: number;
}

/**
 * Distinct sublevels present in the question bank, in canonical sequence
 * order (ascending level, then sublevel). Sublevels with zero authored
 * questions (e.g. "1.2" today) simply never appear here, since they're built
 * from the bank itself — no separate hardcoded sequence list to keep in sync.
 */
export function getOrderedSublevels(bank: AnyGameData[]): SublevelMeta[] {
  const bySublevel = new Map<string, SublevelMeta>();
  for (const q of bank) {
    if (!q.sublevel) continue; // predates the levels/sublevels migration
    const existing = bySublevel.get(q.sublevel);
    if (existing) existing.totalQuestions += 1;
    else bySublevel.set(q.sublevel, { level: q.level, sublevel: q.sublevel, totalQuestions: 1 });
  }
  return [...bySublevel.values()].sort((x, y) => compareSublevels(x.sublevel, y.sublevel));
}

function buildQuestionIdsBySublevel(bank: AnyGameData[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const q of bank) {
    if (!q.sublevel) continue;
    let ids = map.get(q.sublevel);
    if (!ids) {
      ids = new Set();
      map.set(q.sublevel, ids);
    }
    ids.add(q.id);
  }
  return map;
}

/**
 * Per-sublevel completion status for one student, in sequence order.
 * status is 'complete' once every question in that sublevel has been
 * answered at least once, 'in_progress' if some but not all have, and
 * 'not_started' otherwise.
 */
export function computeSublevelProgress(rows: QuestionAttemptRow[], bank: AnyGameData[]): SublevelProgress[] {
  const answeredQuestionIds = new Set(rows.map((r) => r.questionId));
  const questionIdsBySublevel = buildQuestionIdsBySublevel(bank);

  return getOrderedSublevels(bank).map(({ level, sublevel, totalQuestions }) => {
    const ids = questionIdsBySublevel.get(sublevel) ?? new Set<string>();
    let answeredQuestions = 0;
    for (const id of ids) {
      if (answeredQuestionIds.has(id)) answeredQuestions++;
    }
    const status: SublevelStatus =
      answeredQuestions === 0 ? 'not_started' : answeredQuestions >= totalQuestions ? 'complete' : 'in_progress';
    return { level, sublevel, totalQuestions, answeredQuestions, status };
  });
}

/** Latest submissionTime (ms epoch) among this student's rows for each sublevel — used to break ties between multiple in-progress or multiple completed sublevels. */
function lastTouchedBySublevel(rows: QuestionAttemptRow[], bank: AnyGameData[]): Map<string, number> {
  const sublevelByQuestionId = new Map<string, string>();
  for (const q of bank) {
    if (q.sublevel) sublevelByQuestionId.set(q.id, q.sublevel);
  }

  const lastTouched = new Map<string, number>();
  for (const row of rows) {
    const sublevel = sublevelByQuestionId.get(row.questionId);
    if (!sublevel) continue;
    const t = row.submissionTime.getTime();
    const prev = lastTouched.get(sublevel);
    if (prev === undefined || t > prev) lastTouched.set(sublevel, t);
  }
  return lastTouched;
}

/**
 * Picks the most recently touched item. `items` must already be in sequence
 * order (as returned by getOrderedSublevels). On an exact timestamp tie —
 * e.g. two sublevels' questions were both logged in the same QuizAttempt,
 * which shares one submissionTime across all its questions — the
 * later-in-sequence item wins, since a tie is most plausibly forward
 * progress within one session rather than backward.
 */
function mostRecentBySublevel<T extends { sublevel: string }>(items: T[], lastTouched: Map<string, number>): T {
  return items.reduce((best, item) => {
    const bestTime = lastTouched.get(best.sublevel) ?? -Infinity;
    const itemTime = lastTouched.get(item.sublevel) ?? -Infinity;
    return itemTime >= bestTime ? item : best;
  });
}

/**
 * Resolves the single "Continue" target for one student. Rules:
 *   1. If any sublevel is in-progress, that's the target — regardless of
 *      level/sublevel order. If more than one is in-progress (the student
 *      jumped around before finishing any), the most recently touched one
 *      wins, since that's the thread the student is most likely resuming.
 *   2. Otherwise, if nothing has been started at all, target the first
 *      sublevel in sequence (1.1, or whichever sorts first).
 *   3. Otherwise, target the earliest not-started sublevel in sequence
 *      order, regardless of what's been completed elsewhere. There's no
 *      locking, so a student can finish a later sublevel while an earlier
 *      one sits untouched — Continue still surfaces that earlier gap rather
 *      than treating the later completion as "furthest progress."
 *   4. Only if literally every sublevel is complete does Continue report
 *      'sequence_complete' — there is nothing left to suggest.
 *
 * There is no locking, so this is purely a suggestion — never a gate.
 */
export function computeContinueTarget(rows: QuestionAttemptRow[], bank: AnyGameData[]): ContinueTarget {
  const ordered = getOrderedSublevels(bank);
  if (ordered.length === 0) {
    return { level: null, sublevel: null, reason: 'sequence_complete' };
  }

  const progress = computeSublevelProgress(rows, bank);
  const progressBySublevel = new Map(progress.map((p) => [p.sublevel, p] as const));
  const lastTouched = lastTouchedBySublevel(rows, bank);

  const inProgress = ordered
    .map((o) => progressBySublevel.get(o.sublevel)!)
    .filter((p) => p.status === 'in_progress');

  if (inProgress.length > 0) {
    const target = mostRecentBySublevel(inProgress, lastTouched);
    return { level: target.level, sublevel: target.sublevel, reason: 'in_progress' };
  }

  const anyStarted = progress.some((p) => p.status !== 'not_started');
  if (!anyStarted) {
    const first = ordered[0];
    return { level: first.level, sublevel: first.sublevel, reason: 'not_started' };
  }

  const earliestGap = ordered.find((o) => progressBySublevel.get(o.sublevel)!.status === 'not_started');
  if (earliestGap) {
    return { level: earliestGap.level, sublevel: earliestGap.sublevel, reason: 'next_after_complete' };
  }

  // No in-progress sublevel and no gap: every sublevel is complete.
  const last = ordered[ordered.length - 1];
  return { level: last.level, sublevel: last.sublevel, reason: 'sequence_complete' };
}
