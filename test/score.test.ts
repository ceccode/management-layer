import { describe, expect, it } from 'vitest';
import { scoreItems, selectTopItems } from '../src/score/score.js';
import { anArticle, aRedditPost } from './fixtures.js';

const NOW = new Date('2026-11-16T12:00:00.000Z');

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function scoreOf(item: ReturnType<typeof anArticle>, keywords: string[] = []): number {
  return scoreItems([item], keywords, NOW)[0].score;
}

describe('recency', () => {
  it('scores 3 when published less than a day ago', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(23) }))).toBe(3);
  });

  it('scores 1.5 when published less than three days ago', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(24) }))).toBe(1.5);
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(71) }))).toBe(1.5);
  });

  it('scores 0.5 when published less than a week ago', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(72) }))).toBe(0.5);
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(167) }))).toBe(0.5);
  });

  it('scores nothing when a week old or more', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(168) }))).toBe(0);
  });
});

describe('keywords', () => {
  const old = hoursAgo(1000);

  it('adds 0.8 for each keyword found in the title, ignoring case', () => {
    const item = anArticle({ title: 'Strategy and OWNERSHIP in platform teams', publishedAt: old });

    expect(scoreOf(item, ['strategy', 'ownership', 'hiring'])).toBeCloseTo(1.6);
  });

  it('adds nothing when no keyword matches', () => {
    expect(scoreOf(anArticle({ title: 'Kubernetes 2.0', publishedAt: old }), ['strategy'])).toBe(0);
  });
});

describe('reddit engagement', () => {
  const old = hoursAgo(1000);

  it('adds upvotes/50 plus comments/20', () => {
    const post = aRedditPost({ publishedAt: old, upvotes: 100, commentsCount: 20 });

    expect(scoreOf(post)).toBe(3);
  });

  it('is capped at 5', () => {
    const post = aRedditPost({ publishedAt: old, upvotes: 10_000, commentsCount: 10_000 });

    expect(scoreOf(post)).toBe(5);
  });

  it('counts upvotes even when nobody commented', () => {
    const post = aRedditPost({ publishedAt: old, upvotes: 100, commentsCount: 0 });

    expect(scoreOf(post)).toBe(2);
  });

  it('does not apply to articles', () => {
    const article = anArticle({ publishedAt: old, upvotes: 100, commentsCount: 20 });

    expect(scoreOf(article)).toBe(0);
  });
});

describe('source weight', () => {
  it('multiplies the score of an item by the weight of its source', () => {
    const fresh = hoursAgo(1);

    expect(scoreOf(anArticle({ publishedAt: fresh, weight: 1.25 }))).toBeCloseTo(3.75);
    expect(scoreOf(anArticle({ publishedAt: fresh, weight: 0.5 }))).toBeCloseTo(1.5);
  });

  it('ranks a heavier source above a lighter one, all else being equal', () => {
    const light = anArticle({ id: 'light', publishedAt: hoursAgo(1), weight: 1.0 });
    const heavy = anArticle({ id: 'heavy', publishedAt: hoursAgo(1), weight: 1.25 });

    const { topOverall } = selectTopItems(scoreItems([light, heavy], [], NOW));

    expect(topOverall.map(item => item.id)).toEqual(['heavy', 'light']);
  });
});

describe('scoreItems', () => {
  it('measures recency from the given instant, not from the wall clock', () => {
    const item = anArticle({ publishedAt: '2024-12-30T12:00:00.000Z' });

    const [scored] = scoreItems([item], [], new Date('2024-12-31T00:00:00.000Z'));

    expect(scored.score).toBe(3);
  });

  it('sums recency, keywords and engagement without mutating the input', () => {
    const post = aRedditPost({
      title: 'Strategy thread',
      publishedAt: hoursAgo(1),
      upvotes: 50,
      commentsCount: 20,
    });

    const [scored] = scoreItems([post], ['strategy'], NOW);

    expect(scored.score).toBeCloseTo(3 + 0.8 + 2);
    expect(post.score).toBe(0);
  });

  it('keeps every item', () => {
    expect(scoreItems([anArticle(), aRedditPost()], [], NOW)).toHaveLength(2);
  });
});

describe('selectTopItems', () => {
  const items = [
    anArticle({ id: 'a1', score: 1 }),
    aRedditPost({ id: 'r1', score: 5 }),
    anArticle({ id: 'a2', score: 4 }),
    aRedditPost({ id: 'r2', score: 2 }),
    anArticle({ id: 'a3', score: 3 }),
  ];

  it('ranks all items by descending score and keeps the top N', () => {
    const { topOverall } = selectTopItems(items, 3, 5);

    expect(topOverall.map(item => item.id)).toEqual(['r1', 'a2', 'a3']);
  });

  it('ranks reddit posts and articles separately', () => {
    const { topReddit, topArticles } = selectTopItems(items, 2, 1);

    expect(topReddit.map(item => item.id)).toEqual(['r1']);
    expect(topArticles.map(item => item.id)).toEqual(['a2', 'a3']);
  });

  it('does not reorder the input', () => {
    selectTopItems(items, 3, 5);

    expect(items[0].id).toBe('a1');
  });
});
