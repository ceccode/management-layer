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

const DISCUSSION_ENGAGEMENT = {
  upvotesPerPoint: 50,
  commentsPerPoint: 20,
  cap: 5.0,
};

function recencyScore(publishedAt: string, now: Date): number {
  const ageHours = (now.getTime() - new Date(publishedAt).getTime()) / HOUR_MS;
  const bracket = RECENCY_SCORES.find(({ youngerThanHours }) => ageHours < youngerThanHours);

  return bracket ? bracket.score : 0;
}

/**
 * A keyword matches where a word of the title starts with it: "cto" matches
 * "CTO" and "CTOs", but not "factory".
 */
function mentions(title: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'iu').test(title);
}

function keywordScore(title: string, keywords: string[]): number {
  const matches = keywords.filter(keyword => mentions(title, keyword));

  return matches.length * KEYWORD_MATCH_SCORE;
}

function discussionEngagementScore(item: Item): number {
  if (item.type !== 'discussion') {
    return 0;
  }

  const upvoteScore = (item.upvotes ?? 0) / DISCUSSION_ENGAGEMENT.upvotesPerPoint;
  const commentScore = (item.commentsCount ?? 0) / DISCUSSION_ENGAGEMENT.commentsPerPoint;

  return Math.min(upvoteScore + commentScore, DISCUSSION_ENGAGEMENT.cap);
}

/**
 * score = (recency + keyword matches + discussion engagement) × source weight
 *
 * `now` is the instant the report refers to, so that a report for a past
 * date ranks its items the same way every time it is generated.
 */
export function scoreItems(items: Item[], keywords: string[], now: Date): Item[] {
  const scoredItems = items.map(item => {
    const relevance =
      recencyScore(item.publishedAt, now) +
      keywordScore(item.title, keywords) +
      discussionEngagementScore(item);

    return { ...item, score: relevance * item.weight };
  });

  log('info', `Scored ${scoredItems.length} items`);
  return scoredItems;
}

/** The best `limit` items of a ranking, taking at most `maxPerSource` from each source. */
function topItems(ranked: Item[], limit: number, maxPerSource: number): Item[] {
  const takenFrom = new Map<string, number>();
  const top: Item[] = [];

  for (const item of ranked) {
    if (top.length === limit) {
      break;
    }

    const taken = takenFrom.get(item.source) ?? 0;

    if (taken < maxPerSource) {
      takenFrom.set(item.source, taken + 1);
      top.push(item);
    }
  }

  return top;
}

/**
 * `maxPerSource` keeps a prolific source from crowding the others out of a list.
 */
export function selectTopItems(
  items: Item[],
  topN = 10,
  topDiscussionsN = 5,
  maxPerSource = Infinity
): SelectedItems {
  const ranked = [...items].sort((a, b) => b.score - a.score);
  const discussions = ranked.filter(item => item.type === 'discussion');
  const articles = ranked.filter(item => item.type === 'article');

  const selected = {
    topDiscussions: topItems(discussions, topDiscussionsN, maxPerSource),
    topArticles: topItems(articles, topN, maxPerSource),
  };

  log(
    'info',
    `Selected top ${selected.topArticles.length} articles, ${selected.topDiscussions.length} discussions`
  );

  return selected;
}
