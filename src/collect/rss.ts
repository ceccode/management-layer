import Parser from 'rss-parser';
import type { Feed, FeedsConfig } from '../config/schema.js';
import { isWithinDays } from '../utils/date.js';
import { log } from '../utils/logging.js';

export interface RawRSSItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  /** The opening of the entry's own description, as plain text. */
  summary: string;
  /** The categories the feed files the entry under. */
  categories: string[];
  tags: string[];
  weight: number;
}

export interface FeedEntry {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  summary?: string;
  content?: string;
  categories?: unknown[];
}

const SUMMARY_LENGTH = 400;

function plainText(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function summaryOf(entry: FeedEntry): string {
  const text = plainText(entry.contentSnippet || entry.summary || entry.content || '');

  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH).trimEnd()}…` : text;
}

/** Feeds give categories as plain strings (RSS) or as elements with a `term` (Atom). */
function categoriesOf(entry: FeedEntry): string[] {
  return (entry.categories ?? [])
    .map(category => {
      if (typeof category === 'string') {
        return category;
      }

      const element = category as { _?: unknown; $?: { term?: unknown } } | null;
      return element?._ ?? element?.$?.term ?? '';
    })
    .filter((name): name is string => typeof name === 'string' && name.trim() !== '')
    .map(name => name.trim());
}

/** Feeds may link their entries relative to their own address. */
function absoluteLink(link: string, feedUrl: string): string {
  try {
    return new URL(link, feedUrl).toString();
  } catch {
    return link;
  }
}

/** Publishers mark paid content in the address (`/sponsored/`) or in a category. */
function isSponsored(entry: FeedEntry): boolean {
  const marked = /(^|[^a-z])sponsored([^a-z]|$)/i;

  return marked.test(entry.link ?? '') || categoriesOf(entry).some(category => marked.test(category));
}

/** Keeps the entries of a feed that have a title, a link and a date inside the lookback window, leaving out sponsored ones. */
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

    if (!isWithinDays(publishedAt, lookbackDays, now) || isSponsored(entry)) {
      continue;
    }

    items.push({
      title: entry.title,
      link: absoluteLink(entry.link, feed.url),
      publishedAt,
      source: feed.name,
      summary: summaryOf(entry),
      categories: categoriesOf(entry),
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
