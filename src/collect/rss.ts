import Parser from 'rss-parser';
import type { Feed, FeedsConfig } from '../config/schema.js';
import { isWithinDays } from '../utils/date.js';
import { log } from '../utils/logging.js';

interface RawItem {
  title: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
  source: string;
  tags: string[];
  weight: number;
}

export async function collectRSS(config: FeedsConfig): Promise<RawItem[]> {
  const parser = new Parser({
    timeout: 10000,
  });
  
  const allItems: RawItem[] = [];
  
  for (const feed of config.feeds) {
    try {
      log('info', `Fetching RSS feed: ${feed.name}`);
      const result = await parser.parseURL(feed.url);
      
      if (!result.items) {
        log('warn', `No items found in feed: ${feed.name}`);
        continue;
      }
      
      for (const item of result.items) {
        if (!item.title || !item.link) {
          continue;
        }
        
        const dateStr = item.isoDate || item.pubDate;
        if (!dateStr) {
          continue;
        }
        
        if (!isWithinDays(dateStr, config.lookbackDays)) {
          continue;
        }
        
        allItems.push({
          title: item.title,
          link: item.link,
          pubDate: dateStr,
          isoDate: dateStr,
          source: feed.name,
          tags: [...feed.tags],
          weight: feed.weight,
        });
      }
      
      log('success', `Collected ${result.items.length} items from ${feed.name}`);
    } catch (error) {
      log('error', `Failed to fetch feed ${feed.name}:`, error);
    }
  }
  
  log('info', `Total RSS items collected: ${allItems.length}`);
  return allItems;
}
