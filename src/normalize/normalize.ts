import crypto from 'crypto';
import type { Item } from '../config/schema.js';
import type { RawRSSItem } from '../collect/rss.js';
import type { RawDiscussion } from '../collect/discussion.js';

const TRACKING_PARAMETERS = new Set(['ref', 'ref_src', 'fbclid', 'gclid', 'mc_cid', 'mc_eid']);

function isTrackingParameter(name: string): boolean {
  return name.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(name.toLowerCase());
}

function generateId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * Drops the fragment and the tracking parameters, so that the same page
 * reached through different links is recognised as one. Parameters that
 * identify the page (`item?id=123`) are kept.
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    for (const name of [...urlObj.searchParams.keys()]) {
      if (isTrackingParameter(name)) {
        urlObj.searchParams.delete(name);
      }
    }

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
      summary: item.summary,
      categories: item.categories,
    };
  });
}

export function normalizeDiscussions(rawItems: RawDiscussion[]): Item[] {
  return rawItems.map(item => {
    const url = normalizeUrl(item.url);

    return {
      id: generateId(url),
      title: item.title.trim(),
      url,
      source: item.source,
      publishedAt: item.publishedAt,
      type: 'discussion' as const,
      score: 0,
      weight: item.weight,
      tags: item.tags,
      community: item.community,
      upvotes: item.upvotes,
      commentsCount: item.commentsCount,
    };
  });
}
