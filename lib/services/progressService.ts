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
 * completion (the `status` field, computeSublevelProgress/computeContinueTarget)
 * tracks exposure/attempt coverage, not mastery. That original meaning is
 * UNCHANGED below — locking is a separate, additive layer (see
 * computeSublevelLockInfo) that layers a pass/fail concept on top, without
 * altering what "complete" means for Continue-suggestion purposes.
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
  | 'not_started'
  | 'in_progress'
  | 'next_after_complete'
  | 'sequence_complete';

export interface ContinueTarget {
  level: number | null;
  sublevel: string | null;
  reason: ContinueReason;
}

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

export function getOrderedSublevels(bank: AnyGameData[]): SublevelMeta[] {
  const bySublevel = new Map<string, SublevelMeta>();
  for (const q of bank) {
    if (!q.sublevel) continue;
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

function mostRecentBySublevel<T extends { sublevel: string }>(items: T[], lastTouched: Map<string, number>): T {
  return items.reduce((best, item) => {
    const bestTime = lastTouched.get(best.sublevel) ?? -Infinity;
    const itemTime = lastTouched.get(item.sublevel) ?? -Infinity;
    return itemTime >= bestTime ? item : best;
  });
}

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

  const last = ordered[ordered.length - 1];
  return { level: last.level, sublevel: last.sublevel, reason: 'sequence_complete' };
}

// ─────────────────────────────────────────────────────────────────────────
// Locking (new): pass/fail-per-attempt and cascading unlock, layered on top
// of everything above without changing its meaning.
// ─────────────────────────────────────────────────────────────────────────

/** Minimum fraction correct, within a single full attempt at a sublevel, to count as passed. */
export const SUBLEVEL_PASS_THRESHOLD = 0.8;

export interface AttemptSummary {
  attemptId: string;
  userId: string;
  level: number;
  sublevel: string;
  /** From the bank — the sublevel's total question count, not just what this attempt touched. */
  totalQuestions: number;
  answeredQuestions: number;
  correctQuestions: number;
  /** True only when this one attempt covered every question in the sublevel AND scored >= SUBLEVEL_PASS_THRESHOLD. */
  passed: boolean;
}

function groupByAttemptId(rows: QuestionAttemptRow[]): Map<string, QuestionAttemptRow[]> {
  const map = new Map<string, QuestionAttemptRow[]>();
  for (const row of rows) {
    const list = map.get(row.attemptId);
    if (list) list.push(row);
    else map.set(row.attemptId, [row]);
  }
  return map;
}

/**
 * One summary per QuizAttempt document (i.e. per full sublevel playthrough),
 * scoped to whichever sublevel that attempt's questions actually belong to.
 * A single attempt is assumed to belong to one sublevel — true as long as
 * whatever starts a QuizAttempt (PlayContent) only logs one sublevel's
 * questions into it, which matches how startQuizAttempt/updateQuizAttemptProgress
 * are used today. If an attempt's rows span more than one sublevel (shouldn't
 * happen under that assumption), the majority sublevel wins and the rest of
 * that attempt's rows are excluded from its count — logged as a warning so a
 * real violation of the assumption is visible rather than silently wrong.
 */
export function computeAttemptSummaries(rows: QuestionAttemptRow[], bank: AnyGameData[]): AttemptSummary[] {
  const sublevelByQuestionId = new Map<string, { level: number; sublevel: string }>();
  for (const q of bank) {
    if (q.sublevel) sublevelByQuestionId.set(q.id, { level: q.level, sublevel: q.sublevel });
  }
  const totalsBySublevel = new Map(getOrderedSublevels(bank).map((o) => [o.sublevel, o.totalQuestions] as const));

  const summaries: AttemptSummary[] = [];

  for (const [attemptId, attemptRows] of groupByAttemptId(rows)) {
    const countsBySublevel = new Map<string, number>();
    const levelBySublevel = new Map<string, number>();
    for (const row of attemptRows) {
      const meta = sublevelByQuestionId.get(row.questionId);
      if (!meta) continue; // question no longer in the bank, or predates the sublevel migration
      countsBySublevel.set(meta.sublevel, (countsBySublevel.get(meta.sublevel) ?? 0) + 1);
      levelBySublevel.set(meta.sublevel, meta.level);
    }
    if (countsBySublevel.size === 0) continue;

    if (countsBySublevel.size > 1) {
      console.warn(
        `[progressService] attempt ${attemptId} has questions from multiple sublevels (${[...countsBySublevel.keys()].join(', ')}); scoring against the majority only.`,
      );
    }

    let sublevel = '';
    let bestCount = -1;
    for (const [s, c] of countsBySublevel) {
      if (c > bestCount) {
        sublevel = s;
        bestCount = c;
      }
    }

    const relevantRows = attemptRows.filter((r) => sublevelByQuestionId.get(r.questionId)?.sublevel === sublevel);
    const answeredIds = new Set(relevantRows.map((r) => r.questionId));
    const correctIds = new Set(relevantRows.filter((r) => r.result).map((r) => r.questionId));
    const totalQuestions = totalsBySublevel.get(sublevel) ?? answeredIds.size;

    summaries.push({
      attemptId,
      userId: attemptRows[0].userId,
      level: levelBySublevel.get(sublevel)!,
      sublevel,
      totalQuestions,
      answeredQuestions: answeredIds.size,
      correctQuestions: correctIds.size,
      passed:
        totalQuestions > 0 &&
        answeredIds.size >= totalQuestions &&
        correctIds.size / totalQuestions >= SUBLEVEL_PASS_THRESHOLD,
    });
  }

  return summaries;
}

export interface SublevelLockInfo extends SublevelProgress {
  /** True once any single attempt passed this sublevel outright (see AttemptSummary.passed). */
  passed: boolean;
  /** Best score (0-100) across all attempts at this sublevel that answered every question, or null if none did. */
  bestScorePercent: number | null;
  /** True iff every sublevel before this one in sequence has been passed. The first sublevel is always unlocked. */
  unlocked: boolean;
}

/**
 * The full picture LevelGrid/the home page need: per-sublevel exposure
 * status (unchanged, from computeSublevelProgress), plus pass/fail and
 * cascading unlock state. Chained sequentially so a level's-worth of
 * sublevels locks the same way a single level's sublevels do — no separate
 * "level lock" rule needed, since the sequence already crosses level
 * boundaries in order.
 */
export function computeSublevelLockInfo(rows: QuestionAttemptRow[], bank: AnyGameData[]): SublevelLockInfo[] {
  const ordered = getOrderedSublevels(bank);
  const progress = computeSublevelProgress(rows, bank);
  const progressBySublevel = new Map(progress.map((p) => [p.sublevel, p] as const));
  const attempts = computeAttemptSummaries(rows, bank);

  const bestBySublevel = new Map<string, { passed: boolean; bestScorePercent: number | null }>();
  for (const a of attempts) {
    const existing = bestBySublevel.get(a.sublevel) ?? { passed: false, bestScorePercent: null };
    const scorePercent =
      a.answeredQuestions >= a.totalQuestions && a.totalQuestions > 0
        ? Math.round((a.correctQuestions / a.totalQuestions) * 100)
        : null;
    bestBySublevel.set(a.sublevel, {
      passed: existing.passed || a.passed,
      bestScorePercent:
        scorePercent === null ? existing.bestScorePercent : Math.max(existing.bestScorePercent ?? 0, scorePercent),
    });
  }

  let allPriorPassed = true;
  return ordered.map((o) => {
    const p = progressBySublevel.get(o.sublevel)!;
    const best = bestBySublevel.get(o.sublevel) ?? { passed: false, bestScorePercent: null };
    const unlocked = allPriorPassed;
    allPriorPassed = allPriorPassed && best.passed;
    return { ...p, passed: best.passed, bestScorePercent: best.bestScorePercent, unlocked };
  });
}

/** Continue under locking: the earliest sublevel not yet passed (always unlocked by construction). */
export function computeLockedContinueTarget(rows: QuestionAttemptRow[], bank: AnyGameData[]): ContinueTarget {
  const info = computeSublevelLockInfo(rows, bank);
  if (info.length === 0) return { level: null, sublevel: null, reason: 'sequence_complete' };

  const frontier = info.find((s) => !s.passed);
  if (!frontier) {
    const last = info[info.length - 1];
    return { level: last.level, sublevel: last.sublevel, reason: 'sequence_complete' };
  }

  const anyStarted = info.some((s) => s.status !== 'not_started');
  const reason: ContinueReason =
    frontier.status === 'in_progress' ? 'in_progress' : !anyStarted ? 'not_started' : 'next_after_complete';
  return { level: frontier.level, sublevel: frontier.sublevel, reason };
}