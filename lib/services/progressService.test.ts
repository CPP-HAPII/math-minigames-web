import { describe, it, expect } from 'vitest';
import type { QuestionAttemptRow } from './analyticsDataService';
import type { AnyGameData } from '@/lib/types';
import { computeContinueTarget, computeSublevelProgress, getOrderedSublevels } from './progressService';

/** Builds a QuestionAttemptRow with sensible defaults, overridable per test. */
function makeRow(overrides: Partial<QuestionAttemptRow> = {}): QuestionAttemptRow {
  return {
    userId: 'u1',
    attemptId: 'a1',
    submissionTime: new Date('2026-01-01T00:00:00Z'),
    difficulty: 'easy',
    questionId: 'q1',
    skills: [],
    result: true,
    timeTakenInSeconds: 10,
    assistUsed: null,
    assistInteractions: [],
    ...overrides,
  };
}

/** Builds a minimal TypingGameData question with sensible defaults, overridable per test. */
function makeQuestion(overrides: Partial<AnyGameData> & Pick<AnyGameData, 'id' | 'level' | 'sublevel'>): AnyGameData {
  return {
    skills: [],
    score: 10,
    tags: [],
    gameType: 'typing',
    difficulty: 'easy',
    displayedProblem: '',
    multiAcceptedAnswers: [],
    writtenPrompt: '',
    ...overrides,
  } as AnyGameData;
}

// 1.1 (level 1): 3 questions   1.2 (level 1): 2 questions   2.1 (level 2): 2 questions
const bank: AnyGameData[] = [
  makeQuestion({ id: '1.1-P1', level: 1, sublevel: '1.1' }),
  makeQuestion({ id: '1.1-P2', level: 1, sublevel: '1.1' }),
  makeQuestion({ id: '1.1-P3', level: 1, sublevel: '1.1' }),
  makeQuestion({ id: '1.2-P1', level: 1, sublevel: '1.2' }),
  makeQuestion({ id: '1.2-P2', level: 1, sublevel: '1.2' }),
  makeQuestion({ id: '2.1-P1', level: 2, sublevel: '2.1' }),
  makeQuestion({ id: '2.1-P2', level: 2, sublevel: '2.1' }),
];

const T = (isoDate: string) => new Date(isoDate);

describe('getOrderedSublevels', () => {
  it('orders sublevels ascending by level then sublevel, and excludes sublevels absent from the bank', () => {
    expect(getOrderedSublevels(bank)).toEqual([
      { level: 1, sublevel: '1.1', totalQuestions: 3 },
      { level: 1, sublevel: '1.2', totalQuestions: 2 },
      { level: 2, sublevel: '2.1', totalQuestions: 2 },
    ]);
  });

  it('ignores questions with no sublevel assigned (pre-migration questions)', () => {
    const bankWithLegacy = [...bank, makeQuestion({ id: 'legacy-1', level: 0, sublevel: '' })];
    expect(getOrderedSublevels(bankWithLegacy)).toHaveLength(3);
  });
});

describe('computeSublevelProgress', () => {
  it('marks every sublevel not_started when nothing has been answered', () => {
    const progress = computeSublevelProgress([], bank);
    expect(progress.every((p) => p.status === 'not_started')).toBe(true);
    expect(progress.every((p) => p.answeredQuestions === 0)).toBe(true);
  });

  it('marks a sublevel in_progress once some but not all of its questions are answered', () => {
    const rows = [makeRow({ questionId: '1.1-P1' }), makeRow({ questionId: '1.1-P2' })];
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '1.1')).toEqual({
      level: 1,
      sublevel: '1.1',
      totalQuestions: 3,
      answeredQuestions: 2,
      status: 'in_progress',
    });
  });

  it('marks a sublevel complete once all of its questions are answered', () => {
    const rows = ['1.1-P1', '1.1-P2', '1.1-P3'].map((questionId) => makeRow({ questionId }));
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '1.1')?.status).toBe('complete');
  });

  it('does not count a duplicate attempt at the same question twice', () => {
    const rows = [
      makeRow({ questionId: '1.1-P1', attemptId: 'a1' }),
      makeRow({ questionId: '1.1-P1', attemptId: 'a2', result: false }),
    ];
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '1.1')?.answeredQuestions).toBe(1);
  });

  it('counts an answered-but-incorrect question toward completion (tracks exposure, not mastery)', () => {
    const rows = [makeRow({ questionId: '1.1-P1', result: false })];
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '1.1')?.answeredQuestions).toBe(1);
  });
});

describe('computeContinueTarget', () => {
  it('nothing started -> targets the first sublevel in sequence', () => {
    expect(computeContinueTarget([], bank)).toEqual({ level: 1, sublevel: '1.1', reason: 'not_started' });
  });

  it('one sublevel in-progress -> targets it', () => {
    const rows = [
      makeRow({ questionId: '1.1-P1', submissionTime: T('2026-01-01') }),
      makeRow({ questionId: '1.1-P2', submissionTime: T('2026-01-02') }),
    ];
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 1, sublevel: '1.1', reason: 'in_progress' });
  });

  it('one sublevel just completed -> targets the next sublevel in sequence', () => {
    const rows = ['1.1-P1', '1.1-P2', '1.1-P3'].map((questionId) => makeRow({ questionId }));
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 1, sublevel: '1.2', reason: 'next_after_complete' });
  });

  it('jumping around non-sequentially: a later sublevel completed first, then an earlier one started -> in-progress wins over sequence order', () => {
    const rows = [
      makeRow({ questionId: '2.1-P1', submissionTime: T('2026-01-01') }),
      makeRow({ questionId: '2.1-P2', submissionTime: T('2026-01-02') }),
      makeRow({ questionId: '1.1-P1', submissionTime: T('2026-01-03') }),
    ];
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 1, sublevel: '1.1', reason: 'in_progress' });
  });

  it('multiple sublevels in-progress at once -> the most recently touched one wins', () => {
    const rows = [
      makeRow({ questionId: '1.1-P1', submissionTime: T('2026-01-01') }),
      makeRow({ questionId: '2.1-P1', submissionTime: T('2026-01-03') }),
    ];
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 2, sublevel: '2.1', reason: 'in_progress' });
  });

  it('everything complete -> stays on the last sublevel with reason sequence_complete', () => {
    const rows = bank.map((question) => makeRow({ questionId: question.id }));
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 2, sublevel: '2.1', reason: 'sequence_complete' });
  });

  it('there is no locking: a later sublevel can be completed while an earlier one sits untouched -> Continue still surfaces the earlier gap', () => {
    const rows = ['2.1-P1', '2.1-P2'].map((questionId) => makeRow({ questionId }));
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '2.1')?.status).toBe('complete');
    expect(progress.find((p) => p.sublevel === '1.1')?.status).toBe('not_started');
    // 2.1 is finished, but 1.1 (earliest not-started sublevel in sequence) is
    // still the Continue target — completing a later sublevel first doesn't
    // erase the earlier gap.
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 1, sublevel: '1.1', reason: 'next_after_complete' });
  });

  it('everything complete except one early gap -> Continue points to that gap, not sequence_complete', () => {
    const rows = ['1.2-P1', '1.2-P2', '2.1-P1', '2.1-P2'].map((questionId) => makeRow({ questionId }));
    const progress = computeSublevelProgress(rows, bank);
    expect(progress.find((p) => p.sublevel === '1.1')?.status).toBe('not_started');
    expect(progress.find((p) => p.sublevel === '1.2')?.status).toBe('complete');
    expect(progress.find((p) => p.sublevel === '2.1')?.status).toBe('complete');
    expect(computeContinueTarget(rows, bank)).toEqual({ level: 1, sublevel: '1.1', reason: 'next_after_complete' });
  });

  it('empty question bank -> null target', () => {
    expect(computeContinueTarget([], [])).toEqual({ level: null, sublevel: null, reason: 'sequence_complete' });
  });
});
