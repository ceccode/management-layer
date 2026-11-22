import type { Subreddit, SubredditsConfig } from '../config/schema.js';
import { isWithinDays } from '../utils/date.js';
import { log } from '../utils/logging.js';
import type { RawDiscussion } from './discussion.js';

const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const API_URL = 'https://oauth.reddit.com';
const DEFAULT_USER_AGENT = 'ManagementLayer/1.0';
const REQUEST_TIMEOUT_MS = 10_000;
const PAUSE_BETWEEN_REQUESTS_MS = 1000;

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

export interface RedditPost {
  title: string;
  permalink: string;
  created_utc: number;
  ups: number;
  num_comments: number;
}

/** The credentials of the Reddit app, or null when they are not configured. */
export function redditCredentials(env: NodeJS.ProcessEnv = process.env): RedditCredentials | null {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT };
}

/**
 * Application-only OAuth: the app authenticates as itself, with no Reddit
 * user behind it, which is all that reading public posts needs.
 */
async function requestAccessToken(credentials: RedditCredentials): Promise<string> {
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': credentials.userAgent,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Reddit token request failed: ${response.status}`);
  }

  const { access_token: token } = await response.json() as { access_token?: string };

  if (!token) {
    throw new Error('Reddit token request returned no token');
  }

  return token;
}

/** `top_week` is the week's best posts; any other mode is a Reddit listing name (`hot`, `new`). */
export function listingUrl(subreddit: string, sortMode: string, limit: number): string {
  const path = `${API_URL}/r/${encodeURIComponent(subreddit)}`;

  return sortMode === 'top_week'
    ? `${path}/top?t=week&limit=${limit}`
    : `${path}/${encodeURIComponent(sortMode)}?limit=${limit}`;
}

async function fetchPosts(url: string, token: string, userAgent: string): Promise<RedditPost[]> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': userAgent,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const listing = await response.json() as { data?: { children?: Array<{ data: RedditPost }> } };
  return (listing.data?.children ?? []).map(child => child.data);
}

/** Keeps the posts of a subreddit published inside the lookback window. */
export function recentDiscussionsOf(
  subreddit: Subreddit,
  posts: RedditPost[],
  lookbackDays: number,
  now: Date
): RawDiscussion[] {
  return posts
    .map(post => ({
      title: post.title,
      url: `https://www.reddit.com${post.permalink}`,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      source: `reddit:r/${subreddit.name}`,
      community: `r/${subreddit.name}`,
      upvotes: post.ups,
      commentsCount: post.num_comments,
      tags: [...subreddit.tags],
      weight: subreddit.weight,
    }))
    .filter(discussion => isWithinDays(discussion.publishedAt, lookbackDays, now));
}

function withoutRepeats(discussions: RawDiscussion[]): RawDiscussion[] {
  return [...new Map(discussions.map(discussion => [discussion.url, discussion])).values()];
}

function pause(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS));
}

export async function collectReddit(
  config: SubredditsConfig,
  lookbackDays: number,
  now: Date
): Promise<RawDiscussion[]> {
  const credentials = redditCredentials();

  if (!config.enabled || !credentials) {
    return [];
  }

  let token: string;
  try {
    token = await requestAccessToken(credentials);
  } catch (error) {
    log('error', 'Failed to authenticate with Reddit:', error);
    return [];
  }

  const discussions: RawDiscussion[] = [];

  for (const subreddit of config.subreddits) {
    for (const sortMode of config.sortModes) {
      try {
        const url = listingUrl(subreddit.name, sortMode, config.limitPerSubreddit);
        const posts = await fetchPosts(url, token, credentials.userAgent);
        discussions.push(...recentDiscussionsOf(subreddit, posts, lookbackDays, now));
      } catch (error) {
        log('error', `Failed to fetch r/${subreddit.name} (${sortMode}):`, error);
      }

      await pause();
    }

    log('success', `Collected posts from r/${subreddit.name}`);
  }

  const unique = withoutRepeats(discussions);
  log('info', `Total Reddit discussions collected: ${unique.length}`);
  return unique;
}
