import type { Item } from '../config/schema.js';
import type { Report } from '../report/report.js';
import { themeTitles } from '../report/sections.js';
import { truncateText } from '../utils/truncate.js';

const MAX_MESSAGE_LENGTH = 1200;
const DISCLAIMER = '_Disclaimer: contenuto informativo. Nessuna consulenza._';

/** How much of the report a message carries; smaller layouts are tried when a message is too long. */
interface Layout {
  articles: number;
  titleLength: number;
  showSource: boolean;
  discussions: number;
}

const LAYOUTS: Layout[] = [
  { articles: 5, titleLength: 80, showSource: true, discussions: 3 },
  { articles: 5, titleLength: 60, showSource: false, discussions: 3 },
  { articles: 3, titleLength: 60, showSource: false, discussions: 2 },
  { articles: 3, titleLength: 60, showSource: false, discussions: 0 },
];

function articlesSection(articles: Item[], layout: Layout): string {
  const lines = articles.slice(0, layout.articles).map((item, i) => {
    const link = `${i + 1}. [${truncateText(item.title, layout.titleLength)}](${item.url})`;
    return layout.showSource ? `${link} — ${item.source}` : link;
  });

  return `*Top contenuti*\n${lines.join('\n')}`;
}

function discussionsSection(discussions: Item[], layout: Layout): string {
  const lines = discussions.slice(0, layout.discussions).map(item => {
    const title = truncateText(item.title, 70);
    return `• ${item.community} — [${title}](${item.url}) (↑${item.upvotes} 💬${item.commentsCount})`;
  });

  return lines.length > 0 ? `*Community*\n${lines.join('\n')}` : '';
}

/** The themes of the week, when the report has an analysis. */
function themesSection(report: Report): string {
  const titles = themeTitles(report.analysis.themes);

  return titles.length > 0 ? `*Temi della settimana*\n${titles.map(title => `• ${title}`).join('\n')}` : '';
}

function compose(report: Report, layout: Layout): string {
  const sections = [
    `*${report.title}*`,
    articlesSection(report.selected.topArticles, layout),
    discussionsSection(report.selected.topDiscussions, layout),
    themesSection(report),
    DISCLAIMER,
  ];

  return sections.filter(section => section).join('\n\n');
}

export function generateTelegramMarkdown(report: Report): string {
  const messages = LAYOUTS.map(layout => compose(report, layout));

  return messages.find(message => message.length <= MAX_MESSAGE_LENGTH) ?? messages[messages.length - 1];
}
