import { SKILL_MAP } from '@/lib/skillMap';
import type { AssistLevel } from '@/lib/types';
import type { QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import {
  computeAssistUsageByStudent,
  computeAverageTimeBySkill,
  computeInteractionTypeCounts,
  computeSkillAccuracy,
  detectWeakTopics,
  type AssistUsageSummary,
  type InteractionTypeCount,
  type SkillAccuracy,
  type SkillTiming,
} from '@/lib/services/analyticsService';

/**
 * Display-side helpers for the unified teacher portal. Pure functions over
 * already-fetched rows, built on lib/services/analyticsService.ts — no
 * fetching, no React — so they can be unit-tested in the node environment.
 */

/** Skills below this class/student accuracy (0–1) are flagged as weak topics. */
export const WEAK_TOPIC_THRESHOLD = 0.6;
/** Skills at or above this accuracy count as "strong" in the skill-health summary. */
export const STRONG_SKILL_THRESHOLD = 0.9;

/** Student IDs are exactly 3 digits at login (app/page.tsx); anything else was written by a script or test. */
export function isTestAccount(userId: string): boolean {
  return !/^\d{3}$/.test(userId);
}

/** Drops rows written by scripts/smoke tests (non-3-digit IDs) — the portal only ever shows real students. */
export function excludeTestAccounts(rows: QuestionAttemptRow[]): QuestionAttemptRow[] {
  return rows.filter((r) => !isTestAccount(r.userId));
}

/** Human label for a skill tag — SKILL_MAP's label when known, otherwise the tag with underscores spaced out. */
export function skillLabel(skill: string): string {
  const mapped = SKILL_MAP[skill];
  if (mapped) return mapped;
  const spaced = skill.replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : skill;
}

const INTERACTION_LABELS: Record<string, string> = {
  translation_displayed: 'Translation displayed',
  hover_translation: 'Hover translation',
  translation_heard: 'Translation heard',
};

/** Human label for a logged assist-interaction event. */
export function interactionLabel(interaction: string): string {
  return INTERACTION_LABELS[interaction] ?? skillLabel(interaction);
}

/** Whole-number percent for a 0–1 fraction. */
export function toPercent(fraction: number): number {
  return Math.round(fraction * 100);
}

/** "12.3s" under a minute, "1m 05s" from there up. */
export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, '0')}s`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export interface SkillHealth {
  strong: number;
  onTrack: number;
  weak: number;
}

/** Buckets skills into strong (≥90%), on track (threshold–90%) and weak (< threshold). */
export function groupSkillHealth(
  accuracy: SkillAccuracy[],
  threshold = WEAK_TOPIC_THRESHOLD,
  strongThreshold = STRONG_SKILL_THRESHOLD,
): SkillHealth {
  let strong = 0;
  let onTrack = 0;
  let weak = 0;
  for (const a of accuracy) {
    if (a.accuracy < threshold) weak += 1;
    else if (a.accuracy >= strongThreshold) strong += 1;
    else onTrack += 1;
  }
  return { strong, onTrack, weak };
}

function correctFraction(rows: QuestionAttemptRow[]): number {
  return rows.length === 0 ? 0 : rows.filter((r) => r.result).length / rows.length;
}

function averageSeconds(rows: QuestionAttemptRow[]): number {
  return rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.timeTakenInSeconds, 0) / rows.length;
}

export interface ClassSummary {
  /** Student IDs with at least one attempt, sorted. */
  studentIds: string[];
  attempts: number;
  /** Correct attempts / all attempts, 0–1. */
  accuracy: number;
  skillAccuracy: SkillAccuracy[];
  weakTopics: SkillAccuracy[];
  timing: SkillTiming[];
  interactions: InteractionTypeCount[];
  totalInteractions: number;
  health: SkillHealth;
}

/** Everything the class-wide part of the portal shows, from one pass over the (already filtered) rows. */
export function summarizeClass(rows: QuestionAttemptRow[], threshold = WEAK_TOPIC_THRESHOLD): ClassSummary {
  const skillAccuracy = computeSkillAccuracy(rows);
  const interactions = computeInteractionTypeCounts(rows);

  return {
    studentIds: [...new Set(rows.map((r) => r.userId))].sort(),
    attempts: rows.length,
    accuracy: correctFraction(rows),
    skillAccuracy,
    weakTopics: detectWeakTopics(skillAccuracy, threshold),
    timing: computeAverageTimeBySkill(rows),
    interactions,
    totalInteractions: interactions.reduce((sum, i) => sum + i.count, 0),
    health: groupSkillHealth(skillAccuracy, threshold),
  };
}

/** Assist tiers ordered from least to most support (README: Advanced = low, Intermediate = half, Novice = full). */
export const ASSIST_TIERS: { key: AssistLevel | 'none'; label: string; detail: string }[] = [
  { key: 'none', label: 'No assist used', detail: 'Answered without help' },
  { key: 'advanced', label: 'Advanced', detail: 'Low assist' },
  { key: 'intermediate', label: 'Intermediate', detail: 'Half assist' },
  { key: 'novice', label: 'Novice', detail: 'Full assist' },
];

export interface StudentSummary {
  userId: string;
  attempts: number;
  correct: number;
  accuracy: number;
  averageSeconds: number;
  skillAccuracy: SkillAccuracy[];
  weakTopics: SkillAccuracy[];
  timing: SkillTiming[];
  fastest: SkillTiming | null;
  slowest: SkillTiming | null;
  tiers: { key: AssistLevel | 'none'; label: string; detail: string; count: number }[];
  interactions: InteractionTypeCount[];
  assistEvents: number;
}

/** One student's slice of the class rows, summarized for the detail panel. */
export function summarizeStudent(
  allRows: QuestionAttemptRow[],
  userId: string,
  threshold = WEAK_TOPIC_THRESHOLD,
): StudentSummary {
  const rows = allRows.filter((r) => r.userId === userId);
  const skillAccuracy = computeSkillAccuracy(rows);
  const timing = computeAverageTimeBySkill(rows);
  const bySpeed = [...timing].sort((a, b) => a.averageTimeTakenInSeconds - b.averageTimeTakenInSeconds);
  const usage: AssistUsageSummary | undefined = computeAssistUsageByStudent(rows)[0];

  const interactions = usage
    ? Object.entries(usage.interactionTypeCounts)
        .map(([interaction, count]) => ({ interaction, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  return {
    userId,
    attempts: rows.length,
    correct: rows.filter((r) => r.result).length,
    accuracy: correctFraction(rows),
    averageSeconds: averageSeconds(rows),
    skillAccuracy,
    weakTopics: detectWeakTopics(skillAccuracy, threshold),
    timing,
    fastest: bySpeed[0] ?? null,
    slowest: bySpeed.length > 1 ? bySpeed[bySpeed.length - 1] : null,
    tiers: ASSIST_TIERS.map((tier) => ({
      ...tier,
      count: !usage ? 0 : tier.key === 'none' ? usage.noAssistCount : usage.tierCounts[tier.key],
    })),
    interactions,
    assistEvents: interactions.reduce((sum, i) => sum + i.count, 0),
  };
}
