import { describe, it, expect } from 'vitest';
import { formatCorrectAnswer } from './formatCorrectAnswer';

describe('formatCorrectAnswer', () => {
  it('typing: returns the first flat accepted answer', () => {
    expect(
      formatCorrectAnswer({ gameType: 'typing', multiAcceptedAnswers: ['three plus four equals seven', 'alt'] }),
    ).toBe('three plus four equals seven');
  });

  it('jumble: joins the first nested token array with spaces', () => {
    expect(
      formatCorrectAnswer({ gameType: 'jumble', multiAcceptedAnswers: [['Her', 'brother', 'picked', 'nine', 'apples']] }),
    ).toBe('Her brother picked nine apples');
  });

  it('jumble: uses only the first of several accepted variants', () => {
    expect(
      formatCorrectAnswer({
        gameType: 'jumble',
        multiAcceptedAnswers: [
          ['seven', 'plus', 'one', 'equals', 'eight'],
          ['seven', 'plus', 'one', 'is', 'eight'],
        ],
      }),
    ).toBe('seven plus one equals eight');
  });

  it('playback and reading: single-token nested answers', () => {
    expect(formatCorrectAnswer({ gameType: 'playback', multiAcceptedAnswers: [['nineteen']] })).toBe('nineteen');
    expect(formatCorrectAnswer({ gameType: 'reading', multiAcceptedAnswers: [['seventy-seven']] })).toBe('seventy-seven');
  });

  it('fill: drops a single answer into its blank', () => {
    expect(
      formatCorrectAnswer({
        gameType: 'fill',
        blankForm: '23 + 16 = ___ (write the sum in words)',
        multiAcceptedAnswers: ['thirty-nine'],
      }),
    ).toBe('23 + 16 = thirty-nine (write the sum in words)');
  });

  it('fill: drops several answers into their blanks in order', () => {
    expect(
      formatCorrectAnswer({
        gameType: 'fill',
        blankForm: '1: ____ , 0: ____ , 7: ____',
        multiAcceptedAnswers: ['hundred thousands', 'hundreds', 'ones'],
      }),
    ).toBe('1: hundred thousands , 0: hundreds , 7: ones');
  });

  it('fill: keeps multi-word answers whole (never split into tokens)', () => {
    expect(
      formatCorrectAnswer({
        gameType: 'fill',
        blankForm: 'The teams hit the target ____ times',
        multiAcceptedAnswers: ['seven hundred and seventy nine'],
      }),
    ).toBe('The teams hit the target seven hundred and seventy nine times');
  });

  it('fill: falls back to a plain list when blank count and answer count disagree', () => {
    expect(
      formatCorrectAnswer({ gameType: 'fill', blankForm: 'only one ____ here', multiAcceptedAnswers: ['a', 'b'] }),
    ).toBe('a, b');
    expect(
      formatCorrectAnswer({ gameType: 'fill', blankForm: 'two ____ blanks ____', multiAcceptedAnswers: ['a'] }),
    ).toBe('a');
  });

  it('returns an empty string when there are no accepted answers', () => {
    expect(formatCorrectAnswer({ gameType: 'typing', multiAcceptedAnswers: [] })).toBe('');
    expect(formatCorrectAnswer({ gameType: 'typing', multiAcceptedAnswers: undefined })).toBe('');
  });
});
