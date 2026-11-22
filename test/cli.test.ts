import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli.js';

const NOW = new Date('2026-11-21T10:00:00.000Z');

describe('parseArgs', () => {
  it('defaults to a report for today, measured from now', () => {
    expect(parseArgs([], NOW)).toEqual({
      date: '2026-11-21',
      referenceTime: NOW,
      noReddit: false,
      noHackerNews: false,
      noLlm: false,
      ragK: undefined,
    });
  });

  it('reads the flags', () => {
    const options = parseArgs(['--no-reddit', '--no-hn', '--no-llm', '--rag-k', '8'], NOW);

    expect(options).toMatchObject({ noReddit: true, noHackerNews: true, noLlm: true, ragK: 8 });
  });

  it('measures a report for a past date from the end of that day', () => {
    const options = parseArgs(['--date', '2024-12-31'], NOW);

    expect(options.date).toBe('2024-12-31');
    expect(options.referenceTime).toEqual(new Date('2024-12-31T23:59:59.999Z'));
  });

  it('measures a report explicitly dated today from now', () => {
    expect(parseArgs(['--date', '2026-11-21'], NOW).referenceTime).toEqual(NOW);
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(() => parseArgs(['--date', '31/12/2024'], NOW)).toThrow('Invalid --date');
    expect(() => parseArgs(['--date', '2024-13-45'], NOW)).toThrow('Invalid --date');
  });

  it('rejects a lookback that is not a positive integer', () => {
    expect(() => parseArgs(['--rag-k', 'many'], NOW)).toThrow('Invalid --rag-k');
    expect(() => parseArgs(['--rag-k', '0'], NOW)).toThrow('Invalid --rag-k');
  });
});
