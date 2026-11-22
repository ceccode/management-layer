import { describe, expect, it } from 'vitest';
import { scoreItems, selectTopItems } from '../src/score/score.js';
import { anArticle, aDiscussion } from './fixtures.js';

const NOW = new Date('2026-11-16T12:00:00.000Z');

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function scoreOf(item: ReturnType<typeof anArticle>, keywords: string[] = []): number {
  return scoreItems([item], keywords, NOW)[0].score;
}

describe('recency', () => {
  it('scores 1 in the three days before the report', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(1) }))).toBe(1);
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(71) }))).toBe(1);
  });

  it('scores 0.7 in the rest of the week', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(72) }))).toBe(0.7);
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(167) }))).toBe(0.7);
  });

  it('scores nothing when a week old or more', () => {
    expect(scoreOf(anArticle({ publishedAt: hoursAgo(168) }))).toBe(0);
  });
});

describe('keywords', () => {
  const old = hoursAgo(1000);

  it('adds 1 for each keyword found in the title, ignoring case', () => {
    const item = anArticle({ title: 'Strategy and OWNERSHIP in platform teams', publishedAt: old });

    expect(scoreOf(item, ['strategy', 'ownership', 'hiring'])).toBe(2);
  });

  it('does not match a keyword buried inside another word', () => {
    const item = anArticle({ title: 'The AI factory stack', publishedAt: old });

    expect(scoreOf(item, ['cto'])).toBe(0);
  });

  it('matches a keyword at the start of a word, plurals included', () => {
    expect(scoreOf(anArticle({ title: 'What CTOs get wrong', publishedAt: old }), ['cto'])).toBe(1);
    expect(scoreOf(anArticle({ title: 'Why platform teams fail', publishedAt: old }), ['platform team'])).toBe(1);
  });

  it('treats punctuation in a keyword literally', () => {
    expect(scoreOf(anArticle({ title: 'Scaling C++ teams', publishedAt: old }), ['c++'])).toBe(1);
    expect(scoreOf(anArticle({ title: 'Scaling C teams', publishedAt: old }), ['c++'])).toBe(0);
  });

  it('adds nothing when no keyword matches', () => {
    expect(scoreOf(anArticle({ title: 'Kubernetes 2.0', publishedAt: old }), ['strategy'])).toBe(0);
  });

  it('never adds more than 3, however many keywords match', () => {
    const item = anArticle({ title: 'Hiring, strategy, culture, career and burnout', publishedAt: old });

    expect(scoreOf(item, ['hiring', 'strategy', 'culture', 'career', 'burnout'])).toBe(3);
  });
});

describe('keywords beyond the title', () => {
  const old = hoursAgo(1000);

  it('adds 0.5 for a keyword found only in the summary', () => {
    const item = anArticle({ title: 'A quiet week', summary: 'Notes on hiring.', publishedAt: old });

    expect(scoreOf(item, ['hiring'])).toBe(0.5);
  });

  it('reads the categories the feed files the item under', () => {
    const item = anArticle({ title: 'A quiet week', categories: ['Career development', 'Leadership'], publishedAt: old });

    expect(scoreOf(item, ['career', 'leadership'])).toBe(1);
  });

  it("reads the topics its source is filed under in the config", () => {
    const item = anArticle({ title: 'A quiet week', tags: ['engineering-management'], publishedAt: old });

    expect(scoreOf(item, ['engineering management'])).toBe(0.5);
  });

  it('counts a keyword once, in the title, when it is in both places', () => {
    const item = anArticle({ title: 'Hiring well', summary: 'Hiring is hard.', publishedAt: old });

    expect(scoreOf(item, ['hiring'])).toBe(1);
  });

  it('gives all description matches together no more weight than one title match', () => {
    const wordy = anArticle({
      title: 'Unified access policies',
      summary: 'Access management for your organization, with velocity and strategy.',
      publishedAt: old,
    });
    const onTopic = anArticle({ title: 'Management tips', publishedAt: old });
    const keywords = ['management', 'organization', 'velocity', 'strategy'];

    expect(scoreOf(wordy, keywords)).toBe(1);
    expect(scoreOf(onTopic, keywords)).toBe(1);
  });
});

describe('relevance against recency', () => {
  it('ranks an older article on the topic above a fresh one that is not', () => {
    const onTopic = anArticle({ id: 'on-topic', title: 'Coaching new managers', publishedAt: hoursAgo(150) });
    const fresh = anArticle({ id: 'fresh', title: 'What is new in Spark 4.0', publishedAt: hoursAgo(2) });

    const { topArticles } = selectTopItems(scoreItems([fresh, onTopic], ['manager'], NOW));

    expect(topArticles.map(item => item.id)).toEqual(['on-topic', 'fresh']);
  });
});

describe('discussion engagement', () => {
  const old = hoursAgo(1000);

  it('adds upvotes/50 plus comments/20', () => {
    const post = aDiscussion({ publishedAt: old, upvotes: 100, commentsCount: 20 });

    expect(scoreOf(post)).toBe(3);
  });

  it('is capped at 5', () => {
    const post = aDiscussion({ publishedAt: old, upvotes: 10_000, commentsCount: 10_000 });

    expect(scoreOf(post)).toBe(5);
  });

  it('counts upvotes even when nobody commented', () => {
    const post = aDiscussion({ publishedAt: old, upvotes: 100, commentsCount: 0 });

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

    expect(scoreOf(anArticle({ publishedAt: fresh, weight: 1.25 }))).toBeCloseTo(1.25);
    expect(scoreOf(anArticle({ publishedAt: fresh, weight: 0.5 }))).toBeCloseTo(0.5);
  });

  it('ranks a heavier source above a lighter one, all else being equal', () => {
    const light = anArticle({ id: 'light', publishedAt: hoursAgo(1), weight: 1.0 });
    const heavy = anArticle({ id: 'heavy', publishedAt: hoursAgo(1), weight: 1.25 });

    const { topArticles } = selectTopItems(scoreItems([light, heavy], [], NOW));

    expect(topArticles.map(item => item.id)).toEqual(['heavy', 'light']);
  });
});

describe('scoreItems', () => {
  it('measures recency from the given instant, not from the wall clock', () => {
    const item = anArticle({ publishedAt: '2024-12-30T12:00:00.000Z' });

    const [scored] = scoreItems([item], [], new Date('2024-12-31T00:00:00.000Z'));

    expect(scored.score).toBe(1);
  });

  it('sums recency, keywords and engagement without mutating the input', () => {
    const post = aDiscussion({
      title: 'Strategy thread',
      publishedAt: hoursAgo(1),
      upvotes: 50,
      commentsCount: 20,
    });

    const [scored] = scoreItems([post], ['strategy'], NOW);

    expect(scored.score).toBeCloseTo(1 + 1 + 2);
    expect(post.score).toBe(0);
  });

  it('keeps every item', () => {
    expect(scoreItems([anArticle(), aDiscussion()], [], NOW)).toHaveLength(2);
  });
});

describe('selectTopItems', () => {
  const items = [
    anArticle({ id: 'a1', score: 1 }),
    aDiscussion({ id: 'r1', score: 5 }),
    anArticle({ id: 'a2', score: 4 }),
    aDiscussion({ id: 'r2', score: 2 }),
    anArticle({ id: 'a3', score: 3 }),
  ];

  it('ranks articles by descending score and keeps the top N', () => {
    const { topArticles } = selectTopItems(items, 2, 5);

    expect(topArticles.map(item => item.id)).toEqual(['a2', 'a3']);
  });

  it('keeps discussions out of the article ranking, however high they score', () => {
    const viral = aDiscussion({ id: 'viral', score: 99 });

    const { topArticles, topDiscussions } = selectTopItems([...items, viral], 10, 5);

    expect(topArticles.map(item => item.type)).toEqual(['article', 'article', 'article']);
    expect(topDiscussions[0].id).toBe('viral');
  });

  it('ranks discussions and articles separately', () => {
    const { topDiscussions, topArticles } = selectTopItems(items, 2, 1);

    expect(topDiscussions.map(item => item.id)).toEqual(['r1']);
    expect(topArticles.map(item => item.id)).toEqual(['a2', 'a3']);
  });

  it('does not reorder the input', () => {
    selectTopItems(items, 3, 5);

    expect(items[0].id).toBe('a1');
  });

  describe('with a limit per source', () => {
    const prolific = [5, 4, 3, 2].map(score => anArticle({ id: `hbr-${score}`, source: 'HBR', score }));
    const other = anArticle({ id: 'leaddev-1', source: 'LeadDev', score: 1 });

    it('takes only the best items of a source and makes room for the others', () => {
      const { topArticles } = selectTopItems([...prolific, other], 10, 5, 3);

      expect(topArticles.map(item => item.id)).toEqual(['hbr-5', 'hbr-4', 'hbr-3', 'leaddev-1']);
    });

    it('still keeps the ranking by score', () => {
      const strong = anArticle({ id: 'leaddev-9', source: 'LeadDev', score: 4.5 });

      const { topArticles } = selectTopItems([...prolific, strong], 3, 5, 2);

      expect(topArticles.map(item => item.id)).toEqual(['hbr-5', 'leaddev-9', 'hbr-4']);
    });

    it('does not limit sources unless asked to', () => {
      expect(selectTopItems(prolific).topArticles).toHaveLength(4);
    });
  });
});
