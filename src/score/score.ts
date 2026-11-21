import type { Item } from '../config/schema.js';
import type { SelectedItems } from '../report/report.js';
import { log } from '../utils/logging.js';

const HOUR_MS = 60 * 60 * 1000;

const RECENCY_SCORES = [
  { youngerThanHours: 24, score: 3.0 },
  { youngerThanHours: 72, score: 1.5 },
  { youngerThanHours: 168, score: 0.5 },
];

const KEYWORD_MATCH_SCORE = 0.8;

const REDDIT_ENGAGEMENT = {
  upvotesPerPoint: 50,
  commentsPerPoint: 20,
  cap: 5.0,
};

function recencyScore(publishedAt: string, now: Date): number {
  const ageHours = (now.getTime() - new Date(publishedAt).getTime()) / HOUR_MS;
  const bracket = RECENCY_SCORES.find(({ youngerThanHours }) => ageHours < youngerThanHours);

  return bracket ? bracket.score : 0;
}

function keywordScore(title: string, keywords: string[]): number {
  const titleLower = title.toLowerCase();
  const matches = keywords.filter(keyword => titleLower.includes(keyword.toLowerCase()));

  return matches.length * KEYWORD_MATCH_SCORE;
}

function redditEngagementScore(item: Item): number {
  if (item.type !== 'reddit') {
    return 0;
  }

  const upvoteScore = (item.upvotes ?? 0) / REDDIT_ENGAGEMENT.upvotesPerPoint;
  const commentScore = (item.commentsCount ?? 0) / REDDIT_ENGAGEMENT.commentsPerPoint;

  return Math.min(upvoteScore + commentScore, REDDIT_ENGAGEMENT.cap);
}

/**
 * score = (recency + keyword matches + reddit engagement) × source weight
 *
 * `now` is the instant the report refers to, so that a report for a past
 * date ranks its items the same way every time it is generated.
 */
export function scoreItems(items: Item[], keywords: string[], now: Date): Item[] {
  const scoredItems = items.map(item => {
    const relevance =
      recencyScore(item.publishedAt, now) +
      keywordScore(item.title, keywords) +
      redditEngagementScore(item);

    return { ...item, score: relevance * item.weight };
  });

  log('info', `Scored ${scoredItems.length} items`);
  return scoredItems;
}

export function selectTopItems(items: Item[], topN = 10, topRedditN = 5): SelectedItems {
  const ranked = [...items].sort((a, b) => b.score - a.score);

  const selected = {
    topOverall: ranked.slice(0, topN),
    topReddit: ranked.filter(item => item.type === 'reddit').slice(0, topRedditN),
    topArticles: ranked.filter(item => item.type === 'article').slice(0, topN),
  };

  log(
    'info',
    `Selected top ${selected.topOverall.length} overall, ${selected.topReddit.length} reddit, ${selected.topArticles.length} articles`
  );

  return selected;
}
