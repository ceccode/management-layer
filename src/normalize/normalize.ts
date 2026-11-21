import crypto from 'crypto';
import type { Item } from '../config/schema.js';
import type { RawRSSItem } from '../collect/rss.js';
import type { RawRedditItem } from '../collect/reddit.js';

function generateId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

export function normalizeRSSItems(rawItems: RawRSSItem[]): Item[] {
  return rawItems.map(item => {
    const url = normalizeUrl(item.link);

    return {
      id: generateId(url),
      title: item.title.trim(),
      url,
      source: item.source,
      publishedAt: item.publishedAt,
      type: 'article' as const,
      score: 0,
      weight: item.weight,
      tags: item.tags,
    };
  });
}

export function normalizeRedditItems(rawItems: RawRedditItem[]): Item[] {
  return rawItems.map(item => {
    const url = normalizeUrl(item.url);

    return {
      id: generateId(url),
      title: item.title.trim(),
      url,
      source: item.source,
      publishedAt: item.publishedAt,
      type: 'reddit' as const,
      score: 0,
      weight: item.weight,
      tags: item.tags,
      subreddit: item.subreddit,
      upvotes: item.upvotes,
      commentsCount: item.commentsCount,
    };
  });
}
