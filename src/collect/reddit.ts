import type { SubredditsConfig } from '../config/schema.js';
import { log } from '../utils/logging.js';

interface RedditPost {
  title: string;
  permalink: string;
  created_utc: number;
  subreddit: string;
  ups: number;
  num_comments: number;
}

interface RawRedditItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  subreddit: string;
  upvotes: number;
  commentsCount: number;
  tags: string[];
  weight: number;
}

async function getRedditToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  const userAgent = process.env.REDDIT_USER_AGENT || 'ManagementLayer/1.0';
  
  if (!clientId || !clientSecret || !username || !password) {
    log('warn', 'Reddit credentials missing. Skipping Reddit collection.');
    return null;
  }
  
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username,
        password,
      }),
    });
    
    if (!response.ok) {
      log('error', `Reddit token request failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as { access_token: string };
    return data.access_token;
  } catch (error) {
    log('error', 'Failed to get Reddit token:', error);
    return null;
  }
}

async function fetchSubredditPosts(
  subreddit: string,
  sortMode: string,
  limit: number,
  token: string,
  userAgent: string
): Promise<RedditPost[]> {
  try {
    const url = `https://oauth.reddit.com/r/${subreddit}/${sortMode}?limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': userAgent,
      },
    });
    
    if (!response.ok) {
      log('warn', `Failed to fetch r/${subreddit} ${sortMode}: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as { data: { children: Array<{ data: RedditPost }> } };
    return data.data.children.map(child => child.data);
  } catch (error) {
    log('error', `Error fetching r/${subreddit}:`, error);
    return [];
  }
}

export async function collectReddit(config: SubredditsConfig): Promise<RawRedditItem[]> {
  if (!config.enabled) {
    log('info', 'Reddit collection disabled in config');
    return [];
  }
  
  const token = await getRedditToken();
  if (!token) {
    return [];
  }
  
  const userAgent = process.env.REDDIT_USER_AGENT || 'ManagementLayer/1.0';
  const allItems: RawRedditItem[] = [];
  const seenPermalinks = new Set<string>();
  
  for (const subreddit of config.subreddits) {
    for (const sortMode of config.sortModes) {
      const posts = await fetchSubredditPosts(
        subreddit.name,
        sortMode === 'top_week' ? 'top' : sortMode,
        config.limitPerSubreddit,
        token,
        userAgent
      );
      
      for (const post of posts) {
        if (seenPermalinks.has(post.permalink)) {
          continue;
        }
        seenPermalinks.add(post.permalink);
        
        allItems.push({
          title: post.title,
          url: `https://www.reddit.com${post.permalink}`,
          publishedAt: new Date(post.created_utc * 1000).toISOString(),
          source: `reddit:r/${subreddit.name}`,
          subreddit: subreddit.name,
          upvotes: post.ups,
          commentsCount: post.num_comments,
          tags: [...subreddit.tags],
          weight: subreddit.weight,
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log('success', `Collected posts from r/${subreddit.name}`);
  }
  
  log('info', `Total Reddit items collected: ${allItems.length}`);
  return allItems;
}
