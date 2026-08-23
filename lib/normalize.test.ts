import { describe, it, expect } from 'vitest';
import { normalizeComparisonString, evaluateOrderedSelection } from './normalize';

describe('normalizeComparisonString', () => {
  it('lowercases the input', () => {
    expect(normalizeComparisonString('SEVEN')).toBe('seven');
  });

  it('treats a hyphen as a word separator, matching a space-separated form', () => {
    expect(normalizeComparisonString('seventy-seven')).toBe(normalizeComparisonString('seventy seven'));
    expect(normalizeComparisonString('seventy-seven')).toBe('seventy seven');
  });

  it('treats other punctuation (e.g. a period) the same way a hyphen now is', () => {
    // Phase 6 regression: "years-old" must equal "years.old" now that both
    // hyphens and other punctuation collapse to a plain word separator.
    expect(normalizeComparisonString('years-old')).toBe(normalizeComparisonString('years.old'));
    expect(normalizeComparisonString('years-old')).toBe('years old');
  });

  it('removes a standalone "and" (written-number phrasing)', () => {
    expect(normalizeComparisonString('four hundred and fifty three')).toBe(
      normalizeComparisonString('four hundred fifty three'),
    );
  });

  it('does not remove "and" when it is part of a larger word', () => {
    expect(normalizeComparisonString('sandwich')).toBe('sandwich');
  });

  it('collapses repeated whitespace and trims', () => {
    expect(normalizeComparisonString('  seven   eight  ')).toBe('seven eight');
  });

  it('a compound-number accepted answer now matches its space-separated spoken form (the Phase 6 fix)', () => {
    // Real spoken transcripts are always space-separated ("seventy seven"),
    // never hyphenated — this is the exact shape of the bug found testing
    // 1.1-P6 / 3.4-P1 / 4.1-P1, reproduced directly against the normalizer.
    expect(normalizeComparisonString('seventy seven')).toBe(normalizeComparisonString('seventy-seven'));
    expect(normalizeComparisonString('ninety two')).toBe(normalizeComparisonString('ninety-two'));
  });
});

describe('evaluateOrderedSelection (regression: hyphen/space equivalence must not break token-order matching)', () => {
  it('still requires the correct token order for an exact match', () => {
    const answers = [['forty', 'eight']];
    expect(evaluateOrderedSelection(['forty', 'eight'], answers, 2)).toBe('correct');
    expect(evaluateOrderedSelection(['eight', 'forty'], answers, 2)).toBe('wrong');
  });

  it('the lenient whole-phrase pre-check still accepts a hyphenated single-button phrase', () => {
    // A button whose own label is the hyphenated compound ("forty-eight")
    // must still match an accepted answer expressed as two separate tokens.
    const answers = [['forty', 'eight']];
    expect(evaluateOrderedSelection(['forty-eight'], answers, 2)).toBe('correct');
  });

  it('still reports incomplete when fewer than the required tokens are selected', () => {
    const answers = [['forty', 'eight']];
    expect(evaluateOrderedSelection(['forty'], answers, 2)).toBe('incomplete');
  });
});
