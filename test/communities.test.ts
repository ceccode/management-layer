import { describe, expect, it } from 'vitest';
import { searchUrl, toDiscussions } from '../src/collect/hackernews.js';
import { listingUrl, recentDiscussionsOf, redditCredentials } from '../src/collect/reddit.js';

const NOW = new Date('2026-11-16T12:00:00.000Z');

describe('reddit', () => {
  const subreddit = { name: 'ExperiencedDevs', weight: 1.15, tags: ['career'] };
  const post = {
    title: 'A thread',
    permalink: '/r/ExperiencedDevs/comments/abc/a_thread/',
    created_utc: Date.parse('2026-11-15T08:00:00.000Z') / 1000,
    ups: 420,
    num_comments: 87,
  };

  describe('redditCredentials', () => {
    it('needs only the id and the secret of the app, no Reddit user', () => {
      expect(redditCredentials({ REDDIT_CLIENT_ID: 'id', REDDIT_CLIENT_SECRET: 'secret' })).toEqual({
        clientId: 'id',
        clientSecret: 'secret',
        userAgent: 'ManagementLayer/1.0',
      });
    });

    it('uses the configured user agent', () => {
      const env = { REDDIT_CLIENT_ID: 'id', REDDIT_CLIENT_SECRET: 'secret', REDDIT_USER_AGENT: 'custom/2.0' };

      expect(redditCredentials(env)?.userAgent).toBe('custom/2.0');
    });

    it('is missing when either value is', () => {
      expect(redditCredentials({})).toBeNull();
      expect(redditCredentials({ REDDIT_CLIENT_ID: 'id' })).toBeNull();
      expect(redditCredentials({ REDDIT_CLIENT_SECRET: 'secret' })).toBeNull();
    });
  });

  describe('listingUrl', () => {
    it('asks for the best posts of the week', () => {
      expect(listingUrl('ExperiencedDevs', 'top_week', 25)).toBe(
        'https://oauth.reddit.com/r/ExperiencedDevs/top?t=week&limit=25'
      );
    });

    it('asks for any other listing by its name', () => {
      expect(listingUrl('ExperiencedDevs', 'hot', 10)).toBe('https://oauth.reddit.com/r/ExperiencedDevs/hot?limit=10');
    });
  });

  describe('recentDiscussionsOf', () => {
    it('turns a post into a discussion of its subreddit', () => {
      expect(recentDiscussionsOf(subreddit, [post], 7, NOW)).toEqual([
        {
          title: 'A thread',
          url: 'https://www.reddit.com/r/ExperiencedDevs/comments/abc/a_thread/',
          publishedAt: '2026-11-15T08:00:00.000Z',
          source: 'reddit:r/ExperiencedDevs',
          community: 'r/ExperiencedDevs',
          upvotes: 420,
          commentsCount: 87,
          tags: ['career'],
          weight: 1.15,
        },
      ]);
    });

    it('skips posts older than the lookback window', () => {
      const old = { ...post, created_utc: Date.parse('2026-10-01T08:00:00.000Z') / 1000 };

      expect(recentDiscussionsOf(subreddit, [old], 7, NOW)).toEqual([]);
    });
  });
});

describe('hacker news', () => {
  const config = {
    enabled: true,
    weight: 1.0,
    tags: ['community'],
    minPoints: 10,
    hitsPerQuery: 20,
    queries: ['tech lead'],
  };

  describe('searchUrl', () => {
    const url = new URL(searchUrl('tech lead', config, 7, NOW));

    it('searches story titles only, without typo tolerance', () => {
      expect(url.origin + url.pathname).toBe('https://hn.algolia.com/api/v1/search');
      expect(url.searchParams.get('query')).toBe('tech lead');
      expect(url.searchParams.get('tags')).toBe('story');
      expect(url.searchParams.get('restrictSearchableAttributes')).toBe('title');
      expect(url.searchParams.get('typoTolerance')).toBe('false');
    });

    it('keeps to the lookback window and to stories with enough points', () => {
      const since = Date.parse('2026-11-09T12:00:00.000Z') / 1000;

      expect(url.searchParams.get('numericFilters')).toBe(`created_at_i>${since},points>=10`);
      expect(url.searchParams.get('hitsPerPage')).toBe('20');
    });
  });

  describe('toDiscussions', () => {
    const story = {
      objectID: '50509201',
      title: 'Why do tech leaders sound so off-putting?',
      created_at: '2026-11-15T18:11:07Z',
      points: 98,
      num_comments: 118,
    };

    it('links the Hacker News thread, with its points and comments', () => {
      expect(toDiscussions([story], config)).toEqual([
        {
          title: 'Why do tech leaders sound so off-putting?',
          url: 'https://news.ycombinator.com/item?id=50509201',
          publishedAt: '2026-11-15T18:11:07Z',
          source: 'Hacker News',
          community: 'Hacker News',
          upvotes: 98,
          commentsCount: 118,
          tags: ['community'],
          weight: 1.0,
        },
      ]);
    });

    it('counts missing points and comments as zero', () => {
      const [discussion] = toDiscussions([{ ...story, points: null, num_comments: null }], config);

      expect(discussion).toMatchObject({ upvotes: 0, commentsCount: 0 });
    });

    it('skips stories without a title', () => {
      expect(toDiscussions([{ ...story, title: null }], config)).toEqual([]);
    });
  });
});
