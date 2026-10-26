import { describe, it, expect } from 'vitest';
import { checkOrderedSelection, isPossiblePrefix } from './orderedSelection';

const answers = [['Her', 'brother', 'picked', 'nine', 'apples']];

describe('checkOrderedSelection', () => {
  it('keeps a valid start incomplete', () => {
    expect(checkOrderedSelection(['Her'], answers, 5)).toBe('incomplete');
    expect(checkOrderedSelection(['Her', 'brother'], answers, 5)).toBe('incomplete');
  });

  it('calls a short selection wrong once it contradicts every accepted answer', () => {
    expect(checkOrderedSelection(['Maya'], answers, 5)).toBe('wrong');
    expect(checkOrderedSelection(['Her', 'sister'], answers, 5)).toBe('wrong');
  });

  it('still reports correct and wrong for full-length selections', () => {
    expect(checkOrderedSelection(['Her', 'brother', 'picked', 'nine', 'apples'], answers, 5)).toBe('correct');
    expect(checkOrderedSelection(['Her', 'brother', 'picked', 'four', 'apples'], answers, 5)).toBe('wrong');
  });

  it('treats a compound block ("seventy-seven") as a valid start for separate answer tokens', () => {
    expect(checkOrderedSelection(['seventy-seven'], [['seventy', 'seven', 'dollars']], 3)).toBe('incomplete');
  });

  it('accepts a compound block that completes the answer', () => {
    expect(checkOrderedSelection(['forty-eight'], [['forty', 'eight']], 2)).toBe('correct');
  });

  it('checks every accepted answer, not just the first', () => {
    const several = [['She', 'is', 'forty'], ['She', 'was', 'forty']];
    expect(checkOrderedSelection(['She', 'was'], several, 3)).toBe('incomplete');
    expect(checkOrderedSelection(['She', 'will'], several, 3)).toBe('wrong');
  });
});

describe('isPossiblePrefix', () => {
  it('is true for nothing selected', () => {
    expect(isPossiblePrefix([], answers)).toBe(true);
  });
  it('does not match a partial word', () => {
    expect(isPossiblePrefix(['He'], answers)).toBe(false);
  });
});
