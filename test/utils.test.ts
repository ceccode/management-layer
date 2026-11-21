import { describe, expect, it } from 'vitest';
import { formatDate, isWithinDays } from '../src/utils/date.js';
import { countWords, truncateText, truncateWords } from '../src/utils/truncate.js';

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(formatDate(new Date('2026-01-05T23:30:00.000Z'))).toBe('2026-01-05');
  });
});

describe('isWithinDays', () => {
  const now = new Date('2026-11-16T12:00:00.000Z');

  it('accepts a date inside the window', () => {
    expect(isWithinDays('2026-11-10T12:00:00.000Z', 7, now)).toBe(true);
  });

  it('accepts the exact cutoff', () => {
    expect(isWithinDays('2026-11-09T12:00:00.000Z', 7, now)).toBe(true);
  });

  it('rejects a date before the window', () => {
    expect(isWithinDays('2026-11-09T11:59:59.000Z', 7, now)).toBe(false);
  });

  it('rejects a date it cannot parse', () => {
    expect(isWithinDays('not a date', 7, now)).toBe(false);
  });
});

describe('truncateText', () => {
  it('leaves a short text untouched', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('cuts a long text to the maximum length, ellipsis included', () => {
    expect(truncateText('abcdefghij', 8)).toBe('abcde...');
  });
});

describe('truncateWords', () => {
  it('leaves a text within the limit untouched', () => {
    expect(truncateWords('one two three', 3)).toBe('one two three');
  });

  it('keeps the first words and adds an ellipsis', () => {
    expect(truncateWords('one two three four', 2)).toBe('one two...');
  });
});

describe('countWords', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('  one two\n\nthree  ')).toBe(3);
  });

  it('counts none in an empty text', () => {
    expect(countWords('')).toBe(0);
  });
});
