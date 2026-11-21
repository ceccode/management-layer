import { describe, expect, it } from 'vitest';
import { recentItemsOf } from '../src/collect/rss.js';

const NOW = new Date('2026-11-16T12:00:00.000Z');
const feed = { name: 'LeadDev', url: 'https://leaddev.com/rss.xml', weight: 1.25, tags: ['leadership'] };
const entry = { title: 'Systems thinking', link: 'https://leaddev.com/systems', isoDate: '2026-11-15T08:00:00.000Z' };

describe('recentItemsOf', () => {
  it('labels each entry with the name, tags and weight of its feed', () => {
    expect(recentItemsOf(feed, [entry], 7, NOW)).toEqual([
      {
        title: 'Systems thinking',
        link: 'https://leaddev.com/systems',
        publishedAt: '2026-11-15T08:00:00.000Z',
        source: 'LeadDev',
        tags: ['leadership'],
        weight: 1.25,
      },
    ]);
  });

  it('falls back to pubDate when the entry has no ISO date', () => {
    const [item] = recentItemsOf(feed, [{ ...entry, isoDate: undefined, pubDate: 'Sun, 15 Nov 2026 08:00:00 GMT' }], 7, NOW);

    expect(item.publishedAt).toBe('Sun, 15 Nov 2026 08:00:00 GMT');
  });

  it('skips entries without a title, a link or a date', () => {
    const incomplete = [
      { ...entry, title: undefined },
      { ...entry, link: undefined },
      { ...entry, isoDate: undefined },
    ];

    expect(recentItemsOf(feed, incomplete, 7, NOW)).toEqual([]);
  });

  it('skips entries older than the lookback window', () => {
    const old = { ...entry, isoDate: '2026-11-01T08:00:00.000Z' };

    expect(recentItemsOf(feed, [old], 7, NOW)).toEqual([]);
    expect(recentItemsOf(feed, [old], 30, NOW)).toHaveLength(1);
  });
});
