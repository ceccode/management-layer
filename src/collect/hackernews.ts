import type { HackerNewsConfig } from '../config/schema.js';
import { getDateDaysAgo } from '../utils/date.js';
import { log } from '../utils/logging.js';
import type { RawDiscussion } from './discussion.js';

const SEARCH_URL = 'https://hn.algolia.com/api/v1/search';
const SOURCE = 'Hacker News';
const REQUEST_TIMEOUT_MS = 10_000;

export interface HackerNewsStory {
  objectID: string;
  title?: string | null;
  created_at: string;
  points?: number | null;
  num_comments?: number | null;
}

/**
 * Stories of the lookback window whose title contains the query. The search
 * is limited to titles, with no typo tolerance: searching the whole story
 * returns mostly unrelated results.
 */
export function searchUrl(query: string, config: HackerNewsConfig, lookbackDays: number, now: Date): string {
  const since = Math.floor(getDateDaysAgo(lookbackDays, now).getTime() / 1000);

  const parameters = new URLSearchParams({
    query,
    tags: 'story',
    restrictSearchableAttributes: 'title',
    typoTolerance: 'false',
    numericFilters: `created_at_i>${since},points>=${config.minPoints}`,
    hitsPerPage: String(config.hitsPerQuery),
  });

  return `${SEARCH_URL}?${parameters}`;
}

/** The discussion is the Hacker News thread, not the page the story links to. */
export function toDiscussions(stories: HackerNewsStory[], config: HackerNewsConfig): RawDiscussion[] {
  return stories
    .filter(story => story.title)
    .map(story => ({
      title: story.title as string,
      url: `https://news.ycombinator.com/item?id=${story.objectID}`,
      publishedAt: story.created_at,
      source: SOURCE,
      community: SOURCE,
      upvotes: story.points ?? 0,
      commentsCount: story.num_comments ?? 0,
      tags: [...config.tags],
      weight: config.weight,
    }));
}

async function search(url: string): Promise<HackerNewsStory[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const result = await response.json() as { hits?: HackerNewsStory[] };
  return result.hits ?? [];
}

export async function collectHackerNews(
  config: HackerNewsConfig,
  lookbackDays: number,
  now: Date
): Promise<RawDiscussion[]> {
  if (!config.enabled) {
    return [];
  }

  const stories = new Map<string, HackerNewsStory>();

  for (const query of config.queries) {
    try {
      for (const story of await search(searchUrl(query, config, lookbackDays, now))) {
        stories.set(story.objectID, story);
      }
    } catch (error) {
      log('error', `Failed to search Hacker News for "${query}":`, error);
    }
  }

  const discussions = toDiscussions([...stories.values()], config);
  log('info', `Total Hacker News discussions collected: ${discussions.length}`);
  return discussions;
}
