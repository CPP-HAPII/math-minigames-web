import type { AssistLevel } from '@/lib/types';
import type { QuestionAttemptRow } from './analyticsDataService';

/**
 * Pure computation over already-fetched QuestionAttemptRow[] — no Firestore,
 * no fetching, no formatting/rounding for display. Every function here is
 * scope-agnostic: pass the whole roster for a class-wide view, or pre-filter
 * rows to one userId for a single-student view, using the same function
 * either way (see computeSkillAccuracy / computeAverageTimeBySkill).
 */

// ─── Shared result types ────────────────────────────────────────────────────

export interface SkillAccuracy {
  skill: string;
  attempts: number;
  correct: number;
  /** Fraction correct, 0–1 — not a percentage. */
  accuracy: number;
}

export interface StudentSkillAccuracy extends SkillAccuracy {
  userId: string;
}

export interface AssistUsageSummary {
  userId: string;
  totalQuestions: number;
  /** Count of questions whose highest-priority assist interaction was this tier (QuestionAttemptRow.assistUsed). */
  tierCounts: Record<AssistLevel, number>;
  /** Count of questions with no assist interaction recorded at all (assistUsed === null). */
  noAssistCount: number;
  /** Count of questions in which each named interaction (hover_translation, translation_displayed, translation_heard, …) occurred at least once. */
  interactionTypeCounts: Record<string, number>;
}

export interface InteractionTypeCount {
  interaction: string;
  count: number;
}

export interface SkillTiming {
  skill: string;
  attempts: number;
  averageTimeTakenInSeconds: number;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function groupBy<T, K extends string>(rows: T[], keyOf: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/** One QuestionAttemptRow can carry multiple skills; explode so each (skill, row) pair is its own entry. */
function expandBySkill(rows: QuestionAttemptRow[]): { skill: string; row: QuestionAttemptRow }[] {
  const expanded: { skill: string; row: QuestionAttemptRow }[] = [];
  for (const row of rows) {
    for (const skill of row.skills) expanded.push({ skill, row });
  }
  return expanded;
}

// ─── Accuracy by skill ──────────────────────────────────────────────────────

/**
 * Per-skill accuracy across whatever rows are passed in. Scope-agnostic —
 * pass the full roster for a class-wide breakdown, or rows.filter(r =>
 * r.userId === id) for one student.
 */
export function computeSkillAccuracy(rows: QuestionAttemptRow[]): SkillAccuracy[] {
  const groups = groupBy(expandBySkill(rows), (e) => e.skill);
  const result: SkillAccuracy[] = [];
  for (const [skill, entries] of groups) {
    const attempts = entries.length;
    const correct = entries.filter((e) => e.row.result).length;
    result.push({ skill, attempts, correct, accuracy: correct / attempts });
  }
  return result.sort((a, b) => a.skill.localeCompare(b.skill));
}

/** Per-(student, skill) accuracy matrix in one pass — the "per student" half of accuracy-by-skill. */
export function computeSkillAccuracyByStudent(rows: QuestionAttemptRow[]): StudentSkillAccuracy[] {
  const byStudent = groupBy(rows, (r) => r.userId);
  const result: StudentSkillAccuracy[] = [];
  for (const [userId, studentRows] of byStudent) {
    for (const s of computeSkillAccuracy(studentRows)) {
      result.push({ userId, ...s });
    }
  }
  return result.sort((a, b) => a.userId.localeCompare(b.userId) || a.skill.localeCompare(b.skill));
}

// ─── Weak-topic detection ───────────────────────────────────────────────────

/**
 * Filters any accuracy list (class-wide or per-student — both SkillAccuracy
 * and StudentSkillAccuracy satisfy the bound) down to skills below
 * `threshold`, weakest first. Threshold is a 0–1 fraction, default 0.6 (60%).
 */
export function detectWeakTopics<T extends SkillAccuracy>(accuracyRows: T[], threshold = 0.6): T[] {
  return accuracyRows.filter((r) => r.accuracy < threshold).sort((a, b) => a.accuracy - b.accuracy);
}

// ─── Assist-level usage ─────────────────────────────────────────────────────

function emptyTierCounts(): Record<AssistLevel, number> {
  return { novice: 0, intermediate: 0, advanced: 0 };
}

/** Per-student breakdown of assist-tier usage and which interaction types occurred. */
export function computeAssistUsageByStudent(rows: QuestionAttemptRow[]): AssistUsageSummary[] {
  const byStudent = groupBy(rows, (r) => r.userId);
  const result: AssistUsageSummary[] = [];

  for (const [userId, studentRows] of byStudent) {
    const tierCounts = emptyTierCounts();
    let noAssistCount = 0;
    const interactionTypeCounts: Record<string, number> = {};

    for (const row of studentRows) {
      if (row.assistUsed) {
        tierCounts[row.assistUsed] += 1;
      } else {
        noAssistCount += 1;
      }
      for (const interaction of row.assistInteractions) {
        interactionTypeCounts[interaction] = (interactionTypeCounts[interaction] ?? 0) + 1;
      }
    }

    result.push({ userId, totalQuestions: studentRows.length, tierCounts, noAssistCount, interactionTypeCounts });
  }

  return result.sort((a, b) => a.userId.localeCompare(b.userId));
}

/** Class-wide ranking of interaction types by how many questions triggered them, most common first. */
export function computeInteractionTypeCounts(rows: QuestionAttemptRow[]): InteractionTypeCount[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const interaction of row.assistInteractions) {
      counts[interaction] = (counts[interaction] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([interaction, count]) => ({ interaction, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Timing ─────────────────────────────────────────────────────────────────

/**
 * Average time taken per question, per skill, across whatever rows are
 * passed in — scope-agnostic the same way computeSkillAccuracy is.
 */
export function computeAverageTimeBySkill(rows: QuestionAttemptRow[]): SkillTiming[] {
  const groups = groupBy(expandBySkill(rows), (e) => e.skill);
  const result: SkillTiming[] = [];
  for (const [skill, entries] of groups) {
    const attempts = entries.length;
    const totalSeconds = entries.reduce((sum, e) => sum + e.row.timeTakenInSeconds, 0);
    result.push({ skill, attempts, averageTimeTakenInSeconds: totalSeconds / attempts });
  }
  return result.sort((a, b) => a.skill.localeCompare(b.skill));
}
