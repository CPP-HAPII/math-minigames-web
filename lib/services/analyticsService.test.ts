import { describe, it, expect } from 'vitest';
import type { QuestionAttemptRow } from './analyticsDataService';
import {
  computeSkillAccuracy,
  computeSkillAccuracyByStudent,
  detectWeakTopics,
  computeAssistUsageByStudent,
  computeInteractionTypeCounts,
  computeAverageTimeBySkill,
} from './analyticsService';

/** Builds a QuestionAttemptRow with sensible defaults, overridable per test. */
function makeRow(overrides: Partial<QuestionAttemptRow> = {}): QuestionAttemptRow {
  return {
    userId: 'u1',
    attemptId: 'a1',
    submissionTime: new Date('2026-01-01T00:00:00Z'),
    difficulty: 'easy',
    questionId: 'q1',
    skills: ['skillA'],
    result: true,
    timeTakenInSeconds: 10,
    assistUsed: null,
    assistInteractions: [],
    ...overrides,
  };
}

describe('computeSkillAccuracy', () => {
  it('returns [] for empty input', () => {
    expect(computeSkillAccuracy([])).toEqual([]);
  });

  it('computes 100% accuracy for a single correct row', () => {
    const rows = [makeRow({ skills: ['skillA'], result: true })];
    expect(computeSkillAccuracy(rows)).toEqual([{ skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 }]);
  });

  it('computes 0% accuracy for a single incorrect row', () => {
    const rows = [makeRow({ skills: ['skillA'], result: false })];
    expect(computeSkillAccuracy(rows)).toEqual([{ skill: 'skillA', attempts: 1, correct: 0, accuracy: 0 }]);
  });

  it('computes a fractional accuracy across mixed results for the same skill', () => {
    const rows = [
      makeRow({ skills: ['skillA'], result: true }),
      makeRow({ skills: ['skillA'], result: true }),
      makeRow({ skills: ['skillA'], result: false }),
    ];
    expect(computeSkillAccuracy(rows)).toEqual([{ skill: 'skillA', attempts: 3, correct: 2, accuracy: 2 / 3 }]);
  });

  it('all-correct rows across multiple skills each show accuracy 1', () => {
    const rows = [makeRow({ skills: ['skillA'], result: true }), makeRow({ skills: ['skillB'], result: true })];
    expect(computeSkillAccuracy(rows)).toEqual([
      { skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 },
      { skill: 'skillB', attempts: 1, correct: 1, accuracy: 1 },
    ]);
  });

  it('all-incorrect rows across multiple skills each show accuracy 0', () => {
    const rows = [makeRow({ skills: ['skillA'], result: false }), makeRow({ skills: ['skillB'], result: false })];
    expect(computeSkillAccuracy(rows)).toEqual([
      { skill: 'skillA', attempts: 1, correct: 0, accuracy: 0 },
      { skill: 'skillB', attempts: 1, correct: 0, accuracy: 0 },
    ]);
  });

  it('a row tagged with multiple skills contributes to each skill independently', () => {
    const rows = [makeRow({ skills: ['skillA', 'skillB'], result: true })];
    expect(computeSkillAccuracy(rows)).toEqual([
      { skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 },
      { skill: 'skillB', attempts: 1, correct: 1, accuracy: 1 },
    ]);
  });

  it('a row with no skills tagged contributes to no skill and does not crash', () => {
    const rows = [makeRow({ skills: [], result: true }), makeRow({ skills: ['skillA'], result: true })];
    expect(computeSkillAccuracy(rows)).toEqual([{ skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 }]);
  });

  it('sorts output alphabetically by skill', () => {
    const rows = [makeRow({ skills: ['zebra'] }), makeRow({ skills: ['apple'] }), makeRow({ skills: ['mango'] })];
    expect(computeSkillAccuracy(rows).map((r) => r.skill)).toEqual(['apple', 'mango', 'zebra']);
  });
});

describe('computeSkillAccuracyByStudent', () => {
  it('returns [] for empty input', () => {
    expect(computeSkillAccuracyByStudent([])).toEqual([]);
  });

  it('keeps each student\'s accuracy isolated when multiple students are mixed together', () => {
    const rows = [
      // student u1: skillA 1/1 correct
      makeRow({ userId: 'u1', skills: ['skillA'], result: true }),
      // student u2: skillA 0/1 correct (same skill, different student — must not blend with u1's)
      makeRow({ userId: 'u2', skills: ['skillA'], result: false }),
      // student u1: skillB 1/1 correct
      makeRow({ userId: 'u1', skills: ['skillB'], result: true }),
    ];

    const result = computeSkillAccuracyByStudent(rows);

    expect(result).toEqual([
      { userId: 'u1', skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 },
      { userId: 'u1', skill: 'skillB', attempts: 1, correct: 1, accuracy: 1 },
      { userId: 'u2', skill: 'skillA', attempts: 1, correct: 0, accuracy: 0 },
    ]);
  });

  it('sorts output by userId, then by skill', () => {
    const rows = [
      makeRow({ userId: 'zeb', skills: ['skillA'] }),
      makeRow({ userId: 'abe', skills: ['skillB'] }),
      makeRow({ userId: 'abe', skills: ['skillA'] }),
    ];
    const result = computeSkillAccuracyByStudent(rows);
    expect(result.map((r) => `${r.userId}:${r.skill}`)).toEqual(['abe:skillA', 'abe:skillB', 'zeb:skillA']);
  });
});

describe('detectWeakTopics', () => {
  it('returns [] for empty input', () => {
    expect(detectWeakTopics([])).toEqual([]);
  });

  it('returns [] when nothing is below the default threshold', () => {
    const accuracy = [{ skill: 'skillA', attempts: 1, correct: 1, accuracy: 1 }];
    expect(detectWeakTopics(accuracy)).toEqual([]);
  });

  it('threshold boundary: accuracy exactly at the default threshold (0.6) is NOT flagged as weak', () => {
    const accuracy = [{ skill: 'skillA', attempts: 10, correct: 6, accuracy: 0.6 }];
    expect(detectWeakTopics(accuracy, 0.6)).toEqual([]);
  });

  it('threshold boundary: accuracy just below the threshold IS flagged as weak', () => {
    const accuracy = [{ skill: 'skillA', attempts: 100, correct: 59, accuracy: 0.59 }];
    expect(detectWeakTopics(accuracy, 0.6)).toEqual([{ skill: 'skillA', attempts: 100, correct: 59, accuracy: 0.59 }]);
  });

  it('threshold boundary: accuracy just above the threshold is NOT flagged as weak', () => {
    const accuracy = [{ skill: 'skillA', attempts: 100, correct: 61, accuracy: 0.61 }];
    expect(detectWeakTopics(accuracy, 0.6)).toEqual([]);
  });

  it('respects a custom threshold, not just the 0.6 default', () => {
    const accuracy = [
      { skill: 'skillA', attempts: 100, correct: 79, accuracy: 0.79 },
      { skill: 'skillB', attempts: 100, correct: 80, accuracy: 0.8 },
    ];
    expect(detectWeakTopics(accuracy, 0.8)).toEqual([{ skill: 'skillA', attempts: 100, correct: 79, accuracy: 0.79 }]);
  });

  it('sorts weakest first when multiple skills are below threshold', () => {
    const accuracy = [
      { skill: 'skillA', attempts: 10, correct: 5, accuracy: 0.5 },
      { skill: 'skillB', attempts: 10, correct: 0, accuracy: 0 },
      { skill: 'skillC', attempts: 10, correct: 3, accuracy: 0.3 },
    ];
    expect(detectWeakTopics(accuracy, 0.6).map((r) => r.skill)).toEqual(['skillB', 'skillC', 'skillA']);
  });

  it('works on per-student StudentSkillAccuracy input too (generic bound), preserving userId', () => {
    const accuracy = [
      { userId: 'u1', skill: 'skillA', attempts: 10, correct: 2, accuracy: 0.2 },
      { userId: 'u1', skill: 'skillB', attempts: 10, correct: 9, accuracy: 0.9 },
    ];
    expect(detectWeakTopics(accuracy, 0.6)).toEqual([
      { userId: 'u1', skill: 'skillA', attempts: 10, correct: 2, accuracy: 0.2 },
    ]);
  });
});

describe('computeAssistUsageByStudent', () => {
  it('returns [] for empty input', () => {
    expect(computeAssistUsageByStudent([])).toEqual([]);
  });

  it('a row with assistUsed null and assistInteractions [] counts as "no assist"', () => {
    const rows = [makeRow({ userId: 'u1', assistUsed: null, assistInteractions: [] })];
    expect(computeAssistUsageByStudent(rows)).toEqual([
      {
        userId: 'u1',
        totalQuestions: 1,
        tierCounts: { novice: 0, intermediate: 0, advanced: 0 },
        noAssistCount: 1,
        interactionTypeCounts: {},
      },
    ]);
  });

  it('a row with an assist tier and interactions tallies both', () => {
    const rows = [
      makeRow({
        userId: 'u1',
        assistUsed: 'novice',
        assistInteractions: ['translation_displayed', 'translation_heard'],
      }),
    ];
    expect(computeAssistUsageByStudent(rows)).toEqual([
      {
        userId: 'u1',
        totalQuestions: 1,
        tierCounts: { novice: 1, intermediate: 0, advanced: 0 },
        noAssistCount: 0,
        interactionTypeCounts: { translation_displayed: 1, translation_heard: 1 },
      },
    ]);
  });

  it('keeps each student\'s tier/interaction counts isolated when multiple students are mixed together', () => {
    const rows = [
      makeRow({ userId: 'u1', assistUsed: 'novice', assistInteractions: ['hover_translation'] }),
      makeRow({ userId: 'u2', assistUsed: 'advanced', assistInteractions: [] }),
      makeRow({ userId: 'u1', assistUsed: null, assistInteractions: [] }),
    ];

    const result = computeAssistUsageByStudent(rows);
    const u1 = result.find((r) => r.userId === 'u1');
    const u2 = result.find((r) => r.userId === 'u2');

    expect(u1).toEqual({
      userId: 'u1',
      totalQuestions: 2,
      tierCounts: { novice: 1, intermediate: 0, advanced: 0 },
      noAssistCount: 1,
      interactionTypeCounts: { hover_translation: 1 },
    });
    expect(u2).toEqual({
      userId: 'u2',
      totalQuestions: 1,
      tierCounts: { novice: 0, intermediate: 0, advanced: 1 },
      noAssistCount: 0,
      interactionTypeCounts: {},
    });
  });

  it('matches the known ground-truth audit-logging scenario (novice:2, intermediate:1, advanced:0, noAssistCount:1)', () => {
    // Reconstructs the four scripted scenarios from the earlier logging audit
    // for the real 'audit-logging-*' student: A (advanced level, zero
    // interactions), B (intermediate level, hover+translate+3x play — highest
    // tier reached: novice), C (novice level, auto-translate only —
    // intermediate tier), D (novice level, play-translation — novice tier).
    const rows = [
      makeRow({ userId: 'audit-logging-test', questionId: 'q.A', assistUsed: null, assistInteractions: [] }),
      makeRow({
        userId: 'audit-logging-test',
        questionId: 'q.B',
        assistUsed: 'novice',
        assistInteractions: ['hover_translation', 'translation_displayed', 'translation_heard'],
      }),
      makeRow({
        userId: 'audit-logging-test',
        questionId: 'q.C',
        assistUsed: 'intermediate',
        assistInteractions: ['translation_displayed'],
      }),
      makeRow({
        userId: 'audit-logging-test',
        questionId: 'q.D',
        assistUsed: 'novice',
        assistInteractions: ['translation_displayed', 'translation_heard'],
      }),
    ];

    expect(computeAssistUsageByStudent(rows)).toEqual([
      {
        userId: 'audit-logging-test',
        totalQuestions: 4,
        tierCounts: { novice: 2, intermediate: 1, advanced: 0 },
        noAssistCount: 1,
        interactionTypeCounts: { hover_translation: 1, translation_displayed: 3, translation_heard: 2 },
      },
    ]);
  });
});

describe('computeInteractionTypeCounts', () => {
  it('returns [] for empty input', () => {
    expect(computeInteractionTypeCounts([])).toEqual([]);
  });

  it('counts a single interaction from a single row', () => {
    const rows = [makeRow({ assistInteractions: ['hover_translation'] })];
    expect(computeInteractionTypeCounts(rows)).toEqual([{ interaction: 'hover_translation', count: 1 }]);
  });

  it('rows with no assistInteractions contribute nothing', () => {
    const rows = [makeRow({ assistInteractions: [] }), makeRow({ assistInteractions: [] })];
    expect(computeInteractionTypeCounts(rows)).toEqual([]);
  });

  it('sums the same interaction across multiple rows, and across multiple students', () => {
    const rows = [
      makeRow({ userId: 'u1', assistInteractions: ['hover_translation'] }),
      makeRow({ userId: 'u2', assistInteractions: ['hover_translation', 'translation_displayed'] }),
      makeRow({ userId: 'u1', assistInteractions: ['translation_displayed'] }),
    ];
    const result = computeInteractionTypeCounts(rows);
    expect(result).toContainEqual({ interaction: 'hover_translation', count: 2 });
    expect(result).toContainEqual({ interaction: 'translation_displayed', count: 2 });
  });

  it('ranks most-common interaction first', () => {
    const rows = [
      makeRow({ assistInteractions: ['translation_heard'] }),
      makeRow({ assistInteractions: ['hover_translation'] }),
      makeRow({ assistInteractions: ['hover_translation'] }),
      makeRow({ assistInteractions: ['hover_translation'] }),
    ];
    expect(computeInteractionTypeCounts(rows)).toEqual([
      { interaction: 'hover_translation', count: 3 },
      { interaction: 'translation_heard', count: 1 },
    ]);
  });
});

describe('computeAverageTimeBySkill', () => {
  it('returns [] for empty input', () => {
    expect(computeAverageTimeBySkill([])).toEqual([]);
  });

  it('a single row\'s average equals its own time', () => {
    const rows = [makeRow({ skills: ['skillA'], timeTakenInSeconds: 15 })];
    expect(computeAverageTimeBySkill(rows)).toEqual([
      { skill: 'skillA', attempts: 1, averageTimeTakenInSeconds: 15 },
    ]);
  });

  it('averages multiple rows for the same skill, including non-terminating decimals', () => {
    const rows = [
      makeRow({ skills: ['skillA'], timeTakenInSeconds: 10 }),
      makeRow({ skills: ['skillA'], timeTakenInSeconds: 10 }),
      makeRow({ skills: ['skillA'], timeTakenInSeconds: 11 }),
    ];
    expect(computeAverageTimeBySkill(rows)).toEqual([
      { skill: 'skillA', attempts: 3, averageTimeTakenInSeconds: 31 / 3 },
    ]);
  });

  it('a row with no skills tagged contributes to no skill and does not crash', () => {
    const rows = [makeRow({ skills: [], timeTakenInSeconds: 999 }), makeRow({ skills: ['skillA'], timeTakenInSeconds: 5 })];
    expect(computeAverageTimeBySkill(rows)).toEqual([{ skill: 'skillA', attempts: 1, averageTimeTakenInSeconds: 5 }]);
  });

  it('a row tagged with multiple skills contributes its full time to each skill independently, not split', () => {
    const rows = [makeRow({ skills: ['skillA', 'skillB'], timeTakenInSeconds: 20 })];
    expect(computeAverageTimeBySkill(rows)).toEqual([
      { skill: 'skillA', attempts: 1, averageTimeTakenInSeconds: 20 },
      { skill: 'skillB', attempts: 1, averageTimeTakenInSeconds: 20 },
    ]);
  });

  it('sorts output alphabetically by skill', () => {
    const rows = [makeRow({ skills: ['zebra'] }), makeRow({ skills: ['apple'] })];
    expect(computeAverageTimeBySkill(rows).map((r) => r.skill)).toEqual(['apple', 'zebra']);
  });
});
