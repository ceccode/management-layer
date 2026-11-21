import type { Item } from '../src/config/schema.js';
import type { Report } from '../src/report/report.js';

export function anArticle(overrides: Partial<Item> = {}): Item {
  return {
    id: 'article-1',
    title: 'An article',
    url: 'https://example.com/article',
    source: 'Example',
    publishedAt: '2026-11-10T00:00:00.000Z',
    type: 'article',
    score: 0,
    weight: 1,
    tags: [],
    ...overrides,
  };
}

export function aRedditPost(overrides: Partial<Item> = {}): Item {
  return anArticle({
    id: 'reddit-1',
    title: 'A discussion',
    url: 'https://www.reddit.com/r/test/1',
    source: 'reddit:r/test',
    type: 'reddit',
    subreddit: 'test',
    upvotes: 0,
    commentsCount: 0,
    ...overrides,
  });
}

export function aReport(overrides: Partial<Report> = {}): Report {
  return {
    weekDate: '2026-11-16',
    title: 'The Management Layer — 2026-11-16',
    counts: { articles: 25, reddit: 0, feeds: 11, subreddits: 6 },
    selected: { topOverall: [], topReddit: [], topArticles: [] },
    analysis: {
      executiveSummary: 'Sintesi della settimana.',
      themes: '### 1) Governance del codice\n- primo punto\n\n### 2) Produttività\n- secondo punto',
      signals: '- primo segnale\n- secondo segnale',
      divergences: '• una divergenza',
    },
    lookbackDays: 7,
    ...overrides,
  };
}
