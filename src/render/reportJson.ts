import type { Item } from '../config/schema.js';
import { themeTitles } from '../report/sections.js';
import { reportPaths, type Report, type ReportCounts, type ReportPaths } from '../report/report.js';

const SCORING_VERSION = '2.2.0';

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
      themes: themeTitles(analysis.themes),
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
