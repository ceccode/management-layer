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

/** Feeds may link their entries relative to their own address. */
function absoluteLink(link: string, feedUrl: string): string {
  try {
    return new URL(link, feedUrl).toString();
  } catch {
    return link;
  }
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
      link: absoluteLink(entry.link, feed.url),
      publishedAt,
      source: feed.name,
      tags: [...feed.tags],
      weight: feed.weight,
    });
  }

  return items;
}

const ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom';
const REQUEST_TIMEOUT_MS = 10_000;
const REQUEST_HEADERS = {
  'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; rss-reader)',
};

/**
 * Some feeds (Harvard Business Review) bind the Atom namespace to a prefix
 * (`<ns6:feed>`, `<ns6:entry>`). That is valid XML, but rss-parser only
 * recognises unprefixed Atom elements, so the prefix is dropped.
 */
export function withUnprefixedAtom(xml: string): string {
  const binding = xml.match(new RegExp(`xmlns:([\\w.-]+)=["']${ATOM_NAMESPACE}["']`));

  if (!binding) {
    return xml;
  }

  const prefix = binding[1];
  const isPrefixedAtomFeed = new RegExp(`<${prefix}:feed[\\s>]`).test(xml);

  return isPrefixedAtomFeed ? xml.replace(new RegExp(`(</?)${prefix}:`, 'g'), '$1') : xml;
}

async function fetchFeedXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  return response.text();
}

export async function collectRSS(config: FeedsConfig, now: Date): Promise<RawRSSItem[]> {
  const parser = new Parser();
  const allItems: RawRSSItem[] = [];

  for (const feed of config.feeds) {
    try {
      log('info', `Fetching RSS feed: ${feed.name}`);
      const xml = await fetchFeedXml(feed.url);
      const result = await parser.parseString(withUnprefixedAtom(xml));
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
