import { describe, it, expect } from 'vitest';
import type { QuestionAttemptRow } from '@/lib/services/analyticsDataService';
import {
  excludeTestAccounts,
  formatSeconds,
  groupSkillHealth,
  interactionLabel,
  isTestAccount,
  plural,
  skillLabel,
  summarizeClass,
  summarizeStudent,
  toPercent,
} from './teacherPortal';

function makeRow(overrides: Partial<QuestionAttemptRow> = {}): QuestionAttemptRow {
  return {
    userId: '123',
    attemptId: 'a1',
    submissionTime: new Date('2026-01-01T00:00:00Z'),
    difficulty: 'easy',
    questionId: 'q1',
    skills: ['time'],
    result: true,
    timeTakenInSeconds: 10,
    assistUsed: null,
    assistInteractions: [],
    ...overrides,
  };
}

describe('isTestAccount', () => {
  it('treats 3-digit login IDs as real students', () => {
    expect(isTestAccount('007')).toBe(false);
    expect(isTestAccount('999')).toBe(false);
  });

  it('flags anything else as a test account', () => {
    expect(isTestAccount('stage13-smoke')).toBe(true);
    expect(isTestAccount('audit-logging-1785571148212')).toBe(true);
    expect(isTestAccount('1234')).toBe(true);
    expect(isTestAccount('')).toBe(true);
  });
});

describe('labels', () => {
  it('uses SKILL_MAP labels when the tag is known', () => {
    expect(skillLabel('written_two_place_number_values')).toBe('Numbers with Two Places in Written Form');
  });

  it('falls back to a spaced, capitalized tag', () => {
    expect(skillLabel('brand_new_skill')).toBe('Brand new skill');
  });

  it('labels known and unknown interactions', () => {
    expect(interactionLabel('hover_translation')).toBe('Hover translation');
    expect(interactionLabel('speak_question')).toBe('Speak question');
  });
});

describe('formatting', () => {
  it('formats seconds under and over a minute', () => {
    expect(formatSeconds(12.34)).toBe('12.3s');
    expect(formatSeconds(65)).toBe('1m 05s');
    expect(formatSeconds(-1)).toBe('—');
  });

  it('rounds percents and pluralizes', () => {
    expect(toPercent(1 / 3)).toBe(33);
    expect(plural(1, 'attempt')).toBe('1 attempt');
    expect(plural(2, 'attempt')).toBe('2 attempts');
  });
});

describe('groupSkillHealth', () => {
  it('buckets at the threshold boundaries', () => {
    const health = groupSkillHealth([
      { skill: 'a', attempts: 10, correct: 10, accuracy: 1 },
      { skill: 'b', attempts: 10, correct: 9, accuracy: 0.9 },
      { skill: 'c', attempts: 10, correct: 6, accuracy: 0.6 },
      { skill: 'd', attempts: 10, correct: 5, accuracy: 0.5 },
    ]);
    expect(health).toEqual({ strong: 2, onTrack: 1, weak: 1 });
  });
});

describe('summarizeClass', () => {
  const rows = [
    makeRow({ userId: '123', skills: ['time'], result: true }),
    makeRow({ userId: '123', skills: ['three_place_subtraction'], result: false, assistInteractions: ['hover_translation'] }),
    makeRow({ userId: '456', skills: ['time'], result: true, assistInteractions: ['translation_displayed', 'hover_translation'] }),
    makeRow({ userId: 'stage13-smoke', skills: ['time'], result: false }),
  ];

  it('excludeTestAccounts drops script/smoke-test IDs', () => {
    expect(excludeTestAccounts(rows).map((r) => r.userId)).toEqual(['123', '123', '456']);
  });

  it('summarizes the filtered class', () => {
    const s = summarizeClass(excludeTestAccounts(rows));
    expect(s.studentIds).toEqual(['123', '456']);
    expect(s.attempts).toBe(3);
    expect(s.accuracy).toBeCloseTo(2 / 3);
    expect(s.weakTopics.map((w) => w.skill)).toEqual(['three_place_subtraction']);
    expect(s.totalInteractions).toBe(3);
    expect(s.interactions[0]).toEqual({ interaction: 'hover_translation', count: 2 });
  });
});

describe('summarizeStudent', () => {
  it('summarizes accuracy, timing and assist usage for one student', () => {
    const rows = [
      makeRow({ skills: ['time'], result: true, timeTakenInSeconds: 10, assistUsed: 'novice', assistInteractions: ['translation_displayed'] }),
      makeRow({ skills: ['three_place_subtraction'], result: false, timeTakenInSeconds: 40, assistUsed: null }),
      makeRow({ skills: ['three_place_subtraction'], result: false, timeTakenInSeconds: 30, assistUsed: 'advanced', assistInteractions: ['hover_translation', 'translation_displayed'] }),
      makeRow({ userId: '999', skills: ['time'], result: true }),
    ];
    const s = summarizeStudent(rows, '123');
    expect(s.attempts).toBe(3);
    expect(s.correct).toBe(1);
    expect(s.averageSeconds).toBeCloseTo(80 / 3);
    expect(s.weakTopics.map((w) => w.skill)).toEqual(['three_place_subtraction']);
    expect(s.fastest?.skill).toBe('time');
    expect(s.slowest?.skill).toBe('three_place_subtraction');
    expect(Object.fromEntries(s.tiers.map((t) => [t.key, t.count]))).toEqual({
      none: 1,
      advanced: 1,
      intermediate: 0,
      novice: 1,
    });
    expect(s.assistEvents).toBe(3);
    expect(s.interactions[0]).toEqual({ interaction: 'translation_displayed', count: 2 });
  });

  it('returns an empty summary for an unknown student', () => {
    const s = summarizeStudent([], '000');
    expect(s.attempts).toBe(0);
    expect(s.fastest).toBeNull();
    expect(s.tiers.every((t) => t.count === 0)).toBe(true);
  });
});
