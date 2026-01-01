import type { Item } from '../config/schema.js';
import { formatDate } from '../utils/date.js';

interface ReportData {
  weekDate: string;
  counts: {
    articles: number;
    reddit: number;
    feeds: number;
    subreddits: number;
  };
  topOverall: Item[];
  topReddit: Item[];
  llmContent: {
    executiveSummary: string;
    themes: string;
    signals: string;
    divergences: string;
  };
}

export function generateReportMarkdown(data: ReportData): string {
  const frontmatter = `---
title: "The Management Layer — ${data.weekDate}"
date: ${data.weekDate}
scope: "Leadership & Engineering Management"
sources_count:
  articles: ${data.counts.articles}
  reddit: ${data.counts.reddit}
  feeds: ${data.counts.feeds}
  subreddits: ${data.counts.subreddits}
disclaimer: "Contenuto informativo. Non costituisce consulenza professionale o manageriale."
---

`;

  const header = `# The Management Layer — ${data.weekDate}

**How technology is actually led**

`;

  const executiveSummary = `## Executive Summary

${data.llmContent.executiveSummary}

`;

  const topContents = `## Top contenuti della settimana

${data.topOverall.map((item, i) => {
  const date = new Date(item.publishedAt).toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  return `${i + 1}. **[${item.title}](${item.url})**  \n   📰 ${item.source} • ${date}`;
}).join('\n\n')}

`;

  const topRedditSection = data.topReddit.length > 0 ? `## Top discussioni Reddit

${data.topReddit.map(item => {
  return `- **r/${item.subreddit}**: [${item.title}](${item.url})  \n  ↑ ${item.upvotes} • 💬 ${item.commentsCount}`;
}).join('\n\n')}

` : '';

  const themes = `## Temi della settimana

${data.llmContent.themes}

`;

  const signals = `## Segnali da monitorare

${data.llmContent.signals}

`;

  const divergences = data.llmContent.divergences ? `## Divergenze (Articoli vs Reddit)

${data.llmContent.divergences}

` : '';

  const methodology = `## Metodologia e limitazioni

Questo report è generato attraverso:
- **Raccolta dati**: Analisi di feed RSS da fonti editoriali selezionate e discussioni da subreddit rilevanti
- **Scoring deterministico**: Algoritmo basato su recency, keyword matching e engagement (per Reddit)
- **Analisi LLM**: Sintesi e individuazione pattern attraverso modello linguistico
- **Lookback**: Ultimi ${data.counts.feeds} feed RSS e ${data.counts.subreddits} subreddit negli ultimi 7 giorni

**Limitazioni**:
- Il campione è limitato alle fonti configurate
- Possibili bias nella selezione editoriale delle fonti
- Le discussioni Reddit riflettono la prospettiva delle community tech anglofone
- L'analisi LLM può contenere interpretazioni soggettive

`;

  const footer = `---

**Disclaimer**: Questo contenuto ha scopo puramente informativo e di analisi. Non costituisce consulenza professionale, manageriale o di carriera. Le opinioni espresse nei contenuti citati appartengono ai rispettivi autori.

`;

  return frontmatter + header + executiveSummary + topContents + topRedditSection + themes + signals + divergences + methodology + footer;
}
