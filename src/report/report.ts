import type { Item } from '../config/schema.js';
import type { Analysis } from './sections.js';

export interface ReportCounts {
  articles: number;
  /** Community discussions collected (Reddit posts, Hacker News stories). */
  discussions: number;
  feeds: number;
  /** Communities that were read: each subreddit counts as one, Hacker News as one. */
  communities: number;
}

/** Articles and discussions are ranked apart: engagement makes their scores incomparable. */
export interface SelectedItems {
  topDiscussions: Item[];
  topArticles: Item[];
}

/** Everything a weekly report says, independent of the format it is rendered in. */
export interface Report {
  weekDate: string;
  title: string;
  counts: ReportCounts;
  selected: SelectedItems;
  analysis: Analysis;
  lookbackDays: number;
}

export function reportTitle(weekDate: string): string {
  return `The Management Layer — ${weekDate}`;
}

export interface ReportPaths {
  markdown: string;
  telegram: string;
  json: string;
}

/** Where the three files of a week are published, relative to the public directory. */
export function reportPaths(weekDate: string): ReportPaths {
  const basename = `${weekDate}.management-layer`;

  return {
    markdown: `reports/${basename}.md`,
    telegram: `telegram/${basename}.telegram.md`,
    json: `data/${basename}.json`,
  };
}
