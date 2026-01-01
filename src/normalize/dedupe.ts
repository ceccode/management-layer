import type { Item } from '../config/schema.js';
import { log } from '../utils/logging.js';

export function deduplicateItems(items: Item[]): Item[] {
  const seen = new Map<string, Item>();
  
  for (const item of items) {
    const existing = seen.get(item.id);
    
    if (!existing) {
      seen.set(item.id, item);
    } else {
      const existingDate = new Date(existing.publishedAt);
      const itemDate = new Date(item.publishedAt);
      
      if (itemDate > existingDate) {
        seen.set(item.id, item);
      }
    }
  }
  
  const deduplicated = Array.from(seen.values());
  const duplicatesCount = items.length - deduplicated.length;
  
  if (duplicatesCount > 0) {
    log('info', `Removed ${duplicatesCount} duplicate items`);
  }
  
  return deduplicated;
}
