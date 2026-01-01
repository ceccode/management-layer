import crypto from 'crypto';
import type { Item } from '../config/schema.js';

interface RawRSSItem {
  title: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
  source: string;
  tags: string[];
  weight: number;
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
    const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
    
    return {
      id: generateId(url),
      title: item.title.trim(),
      url,
      source: item.source,
      publishedAt,
      type: 'article' as const,
      score: 0,
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
      tags: item.tags,
      subreddit: item.subreddit,
      upvotes: item.upvotes,
      commentsCount: item.commentsCount,
    };
  });
}
