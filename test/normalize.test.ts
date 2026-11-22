import { describe, expect, it } from 'vitest';
import { normalizeRSSItems, normalizeDiscussions } from '../src/normalize/normalize.js';
import { deduplicateItems } from '../src/normalize/dedupe.js';
import { anArticle } from './fixtures.js';

const rawArticle = {
  title: '  Systems thinking  ',
  link: 'https://example.com/post?utm_source=rss#comments',
  publishedAt: '2026-11-10T08:00:00.000Z',
  source: 'Example',
  tags: ['leadership'],
  weight: 1.2,
};

const rawPost = {
  title: ' A thread ',
  url: 'https://www.reddit.com/r/test/comments/1/?ref=share',
  publishedAt: '2026-11-11T08:00:00.000Z',
  source: 'reddit:r/test',
  community: 'r/test',
  upvotes: 42,
  commentsCount: 7,
  tags: ['career'],
  weight: 1.1,
};

describe('normalizeRSSItems', () => {
  it('turns a feed entry into an unscored article', () => {
    const [item] = normalizeRSSItems([rawArticle]);

    expect(item).toMatchObject({
      title: 'Systems thinking',
      url: 'https://example.com/post',
      source: 'Example',
      publishedAt: '2026-11-10T08:00:00.000Z',
      type: 'article',
      score: 0,
      weight: 1.2,
      tags: ['leadership'],
    });
  });

  it('gives the same id to the same page reached through different tracking links', () => {
    const [a, b] = normalizeRSSItems([
      rawArticle,
      { ...rawArticle, link: 'https://example.com/post?utm_source=newsletter' },
    ]);

    expect(a.id).toBe(b.id);
  });

  it('gives different ids to different pages', () => {
    const [a, b] = normalizeRSSItems([rawArticle, { ...rawArticle, link: 'https://example.com/other' }]);

    expect(a.id).not.toBe(b.id);
  });

  it('keeps the parameters that identify a page', () => {
    const [a, b] = normalizeRSSItems([
      { ...rawArticle, link: 'https://news.ycombinator.com/item?id=1&utm_source=rss' },
      { ...rawArticle, link: 'https://news.ycombinator.com/item?id=2' },
    ]);

    expect(a.url).toBe('https://news.ycombinator.com/item?id=1');
    expect(a.id).not.toBe(b.id);
  });

  it('keeps a link it cannot parse as it is', () => {
    const [item] = normalizeRSSItems([{ ...rawArticle, link: 'not a url' }]);

    expect(item.url).toBe('not a url');
  });
});

describe('normalizeDiscussions', () => {
  it('turns a post into an unscored discussion keeping its engagement', () => {
    const [item] = normalizeDiscussions([rawPost]);

    expect(item).toMatchObject({
      title: 'A thread',
      url: 'https://www.reddit.com/r/test/comments/1/',
      type: 'discussion',
      score: 0,
      weight: 1.1,
      community: 'r/test',
      upvotes: 42,
      commentsCount: 7,
    });
  });
});

describe('deduplicateItems', () => {
  it('keeps items with different ids', () => {
    const items = [anArticle({ id: 'a' }), anArticle({ id: 'b' })];

    expect(deduplicateItems(items)).toHaveLength(2);
  });

  it('keeps the most recently published of two items with the same id', () => {
    const older = anArticle({ id: 'a', source: 'older', publishedAt: '2026-11-01T00:00:00Z' });
    const newer = anArticle({ id: 'a', source: 'newer', publishedAt: '2026-11-02T00:00:00Z' });

    expect(deduplicateItems([older, newer]).map(item => item.source)).toEqual(['newer']);
    expect(deduplicateItems([newer, older]).map(item => item.source)).toEqual(['newer']);
  });
});
