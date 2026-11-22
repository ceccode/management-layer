import type { Item } from '../config/schema.js';
import { reportPaths, type Report, type ReportCounts, type ReportPaths } from '../report/report.js';

const SCORING_VERSION = '2.2.0';
const MAX_THEMES = 3;

export interface JsonReport {
  date: string;
  title: string;
  counts: ReportCounts;
  /** The items of "Top contenuti": articles only since scoring 2.2.0, kept under this name for readers of older reports. */
  itemsTopOverall: Item[];
  itemsTopDiscussions: Item[];
  itemsTopArticles: Item[];
  llm: {
    executiveSummary: string;
    themes: string[];
    signals: string[];
    divergences: string[];
  };
  paths: ReportPaths;
  methodology: {
    lookbackDays: number;
    scoringVersion: string;
  };
}

function parseListItems(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim());
  return lines
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.replace(/^[\s-•]+/, '').trim())
    .filter(line => line.length > 0);
}

/** The titles of the `### n) Title` sub-headings of the themes section. */
function parseThemeTitles(themesText: string): string[] {
  const themePattern = /###\s+\d+\)\s+(.+?)(?=###|\n-|\n•|$)/gs;
  const matches = [...themesText.matchAll(themePattern)];
  
  return matches.map(match => match[1].trim()).slice(0, MAX_THEMES);
}

export function generateReportJson(report: Report): JsonReport {
  const { analysis, selected } = report;

  return {
    date: report.weekDate,
    title: report.title,
    counts: report.counts,
    itemsTopOverall: selected.topArticles,
    itemsTopDiscussions: selected.topDiscussions,
    itemsTopArticles: selected.topArticles,
    llm: {
      executiveSummary: analysis.executiveSummary,
      themes: parseThemeTitles(analysis.themes),
      signals: parseListItems(analysis.signals),
      divergences: parseListItems(analysis.divergences),
    },
    paths: reportPaths(report.weekDate),
    methodology: {
      lookbackDays: report.lookbackDays,
      scoringVersion: SCORING_VERSION,
    },
  };
}
