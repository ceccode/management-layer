import type { Report } from '../report/report.js';
import { truncateText } from '../utils/truncate.js';

const MAX_MESSAGE_LENGTH = 1200;

export function generateTelegramMarkdown(report: Report): string {
  const { topOverall, topReddit } = report.selected;

  const header = `*${report.title}*\n\n`;
  
  const topContents = `*Top contenuti*\n${topOverall.slice(0, 5).map((item, i) => {
    const title = truncateText(item.title, 80);
    return `${i + 1}. [${title}](${item.url}) — ${item.source}`;
  }).join('\n')}\n\n`;
  
  const redditSection = topReddit.length > 0 
    ? `*Reddit*\n${topReddit.slice(0, 3).map(item => {
        const title = truncateText(item.title, 70);
        return `• r/${item.subreddit} — [${title}](${item.url}) (↑${item.upvotes} 💬${item.commentsCount})`;
      }).join('\n')}\n\n`
    : '';
  
  const summary = `*In sintesi*\n• Leadership e engineering management\n• Organizzazione e team topology\n• Developer productivity e cultura\n\n`;
  
  const disclaimer = `_Disclaimer: contenuto informativo. Nessuna consulenza._`;
  
  const content = header + topContents + redditSection + summary + disclaimer;
  
  if (content.length > MAX_MESSAGE_LENGTH) {
    const reduced = header + 
      `*Top contenuti*\n${topOverall.slice(0, 3).map((item, i) => {
        const title = truncateText(item.title, 60);
        return `${i + 1}. [${title}](${item.url})`;
      }).join('\n')}\n\n` +
      summary + disclaimer;
    return reduced;
  }
  
  return content;
}
