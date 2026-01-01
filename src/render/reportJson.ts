import type { Item } from '../config/schema.js';

interface JsonReportData {
  weekDate: string;
  title: string;
  counts: {
    articles: number;
    reddit: number;
    feeds: number;
    subreddits: number;
  };
  topOverall: Item[];
  topReddit: Item[];
  topArticles: Item[];
  llmContent: {
    executiveSummary: string;
    themes: string;
    signals: string;
    divergences: string;
  };
  lookbackDays: number;
}

interface JsonReport {
  date: string;
  title: string;
  counts: {
    articles: number;
    reddit: number;
    feeds: number;
    subreddits: number;
  };
  itemsTopOverall: Item[];
  itemsTopReddit: Item[];
  itemsTopArticles: Item[];
  llm: {
    executiveSummary: string;
    themes: string[];
    signals: string[];
    divergences: string[];
  };
  paths: {
    markdown: string;
    telegram: string;
    json: string;
  };
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

function parseThemes(themesText: string): string[] {
  const themePattern = /###\s+\d+\)\s+(.+?)(?=###|\n-|\n•|$)/gs;
  const matches = [...themesText.matchAll(themePattern)];
  
  if (matches.length > 0) {
    return matches.map(m => m[1].trim()).slice(0, 3);
  }
  
  return ['Engineering Management e Leadership', 'Pratiche e Processi', 'Cultura e Organizzazione'];
}

export function generateReportJson(data: JsonReportData): JsonReport {
  const basename = `${data.weekDate}.management-layer`;
  
  return {
    date: data.weekDate,
    title: data.title,
    counts: data.counts,
    itemsTopOverall: data.topOverall,
    itemsTopReddit: data.topReddit,
    itemsTopArticles: data.topArticles,
    llm: {
      executiveSummary: data.llmContent.executiveSummary,
      themes: parseThemes(data.llmContent.themes),
      signals: parseListItems(data.llmContent.signals),
      divergences: parseListItems(data.llmContent.divergences),
    },
    paths: {
      markdown: `reports/${basename}.md`,
      telegram: `telegram/${basename}.telegram.md`,
      json: `data/${basename}.json`,
    },
    methodology: {
      lookbackDays: data.lookbackDays,
      scoringVersion: '1.0.0',
    },
  };
}
