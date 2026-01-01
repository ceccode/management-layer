import type { Item } from '../config/schema.js';
import { truncateText } from '../utils/truncate.js';

interface TelegramData {
  weekDate: string;
  topOverall: Item[];
  topReddit: Item[];
}

export function generateTelegramMarkdown(data: TelegramData): string {
  const header = `*The Management Layer — ${data.weekDate}*\n\n`;
  
  const topContents = `*Top contenuti*\n${data.topOverall.slice(0, 5).map((item, i) => {
    const title = truncateText(item.title, 80);
    return `${i + 1}. [${title}](${item.url}) — ${item.source}`;
  }).join('\n')}\n\n`;
  
  const redditSection = data.topReddit.length > 0 
    ? `*Reddit*\n${data.topReddit.slice(0, 3).map(item => {
        const title = truncateText(item.title, 70);
        return `• r/${item.subreddit} — [${title}](${item.url}) (↑${item.upvotes} 💬${item.commentsCount})`;
      }).join('\n')}\n\n`
    : '';
  
  const summary = `*In sintesi*\n• Leadership e engineering management\n• Organizzazione e team topology\n• Developer productivity e cultura\n\n`;
  
  const disclaimer = `_Disclaimer: contenuto informativo. Nessuna consulenza._`;
  
  const content = header + topContents + redditSection + summary + disclaimer;
  
  if (content.length > 1200) {
    const reduced = header + 
      `*Top contenuti*\n${data.topOverall.slice(0, 3).map((item, i) => {
        const title = truncateText(item.title, 60);
        return `${i + 1}. [${title}](${item.url})`;
      }).join('\n')}\n\n` +
      summary + disclaimer;
    return reduced;
  }
  
  return content;
}
