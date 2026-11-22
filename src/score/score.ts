import type { Item } from '../config/schema.js';
import type { SelectedItems } from '../report/report.js';
import { log } from '../utils/logging.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Recency only separates this half of the week from the other: in a weekly
 * digest it should break ties, not decide the ranking.
 */
const RECENCY_SCORES = [
  { youngerThanHours: 72, score: 1.0 },
  { youngerThanHours: 168, score: 0.7 },
];

/**
 * A keyword in the title says more about an item than one in its description.
 * Descriptions are long and full of generic words ("access management",
 * "organization policy"), so together they count for no more than one title match.
 */
const KEYWORD_SCORES = {
  inTitle: 1.0,
  inDescription: 0.5,
  descriptionCap: 1.0,
  cap: 3.0,
};

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
 * A keyword matches where a word of the text starts with it: "cto" matches
 * "CTO" and "CTOs", but not "factory".
 */
function mentions(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'iu').test(text);
}

/**
 * What is known about the item beyond its title: its own summary and
 * categories, and the topics its source is filed under in the config
 * (`engineering-management` reads as "engineering management").
 */
function descriptionOf(item: Item): string {
  const sourceTopics = item.tags.map(tag => tag.replace(/-/g, ' '));

  return [item.summary ?? '', ...(item.categories ?? []), ...sourceTopics].join('\n');
}

function keywordScore(item: Item, keywords: string[]): number {
  const description = descriptionOf(item);
  const inTitle = keywords.filter(keyword => mentions(item.title, keyword));
  const inDescriptionOnly = keywords.filter(
    keyword => !inTitle.includes(keyword) && mentions(description, keyword)
  );

  const titleScore = inTitle.length * KEYWORD_SCORES.inTitle;
  const descriptionScore = Math.min(
    inDescriptionOnly.length * KEYWORD_SCORES.inDescription,
    KEYWORD_SCORES.descriptionCap
  );

  return Math.min(titleScore + descriptionScore, KEYWORD_SCORES.cap);
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
 * Keyword matches carry up to three times the weight of recency, so that what
 * an item is about counts for more than the day it came out.
 *
 * `now` is the instant the report refers to, so that a report for a past
 * date ranks its items the same way every time it is generated.
 */
export function scoreItems(items: Item[], keywords: string[], now: Date): Item[] {
  const scoredItems = items.map(item => {
    const relevance =
      recencyScore(item.publishedAt, now) +
      keywordScore(item, keywords) +
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
