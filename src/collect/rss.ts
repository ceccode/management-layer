import Parser from 'rss-parser';
import type { Feed, FeedsConfig } from '../config/schema.js';
import { isWithinDays } from '../utils/date.js';
import { log } from '../utils/logging.js';

export interface RawRSSItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  tags: string[];
  weight: number;
}

export interface FeedEntry {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
}

/** Keeps the entries of a feed that have a title, a link and a date inside the lookback window. */
export function recentItemsOf(
  feed: Feed,
  entries: FeedEntry[],
  lookbackDays: number,
  now: Date
): RawRSSItem[] {
  const items: RawRSSItem[] = [];

  for (const entry of entries) {
    const publishedAt = entry.isoDate || entry.pubDate;

    if (!entry.title || !entry.link || !publishedAt) {
      continue;
    }

    if (!isWithinDays(publishedAt, lookbackDays, now)) {
      continue;
    }

    items.push({
      title: entry.title,
      link: entry.link,
      publishedAt,
      source: feed.name,
      tags: [...feed.tags],
      weight: feed.weight,
    });
  }

  return items;
}

export async function collectRSS(config: FeedsConfig, now: Date): Promise<RawRSSItem[]> {
  const parser = new Parser({
    timeout: 10000,
  });

  const allItems: RawRSSItem[] = [];

  for (const feed of config.feeds) {
    try {
      log('info', `Fetching RSS feed: ${feed.name}`);
      const result = await parser.parseURL(feed.url);
      const items = recentItemsOf(feed, result.items ?? [], config.lookbackDays, now);

      allItems.push(...items);
      log('success', `Collected ${items.length} recent items from ${feed.name}`);
    } catch (error) {
      log('error', `Failed to fetch feed ${feed.name}:`, error);
    }
  }

  log('info', `Total RSS items collected: ${allItems.length}`);
  return allItems;
}
