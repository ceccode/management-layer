import type { Report } from '../report/report.js';
import { SECTION_TITLES } from '../report/sections.js';

export function generateReportMarkdown(report: Report): string {
  const { counts, analysis, selected } = report;

  const frontmatter = `---
title: "${report.title}"
date: ${report.weekDate}
scope: "Leadership & Engineering Management"
sources_count:
  articles: ${counts.articles}
  reddit: ${counts.reddit}
  feeds: ${counts.feeds}
  subreddits: ${counts.subreddits}
disclaimer: "Contenuto informativo. Non costituisce consulenza professionale o manageriale."
---

`;

  const header = `# ${report.title}

**How technology is actually led**

`;

  const executiveSummary = `## ${SECTION_TITLES.executiveSummary}

${analysis.executiveSummary}

`;

  const topContents = `## Top contenuti della settimana

${selected.topOverall.map((item, i) => {
  const date = new Date(item.publishedAt).toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  return `${i + 1}. **[${item.title}](${item.url})**  \n   📰 ${item.source} • ${date}`;
}).join('\n\n')}

`;

  const topRedditSection = selected.topReddit.length > 0 ? `## Top discussioni Reddit

${selected.topReddit.map(item => {
  return `- **r/${item.subreddit}**: [${item.title}](${item.url})  \n  ↑ ${item.upvotes} • 💬 ${item.commentsCount}`;
}).join('\n\n')}

` : '';

  const themes = `## ${SECTION_TITLES.themes}

${analysis.themes}

`;

  const signals = `## ${SECTION_TITLES.signals}

${analysis.signals}

`;

  const divergences = analysis.divergences ? `## ${SECTION_TITLES.divergences}

${analysis.divergences}

` : '';

  const methodology = `## Metodologia e limitazioni

Questo report è generato attraverso:
- **Raccolta dati**: Analisi di feed RSS da fonti editoriali selezionate e discussioni da subreddit rilevanti
- **Scoring deterministico**: Algoritmo basato su recency, keyword matching e engagement (per Reddit)
- **Analisi LLM**: Sintesi e individuazione pattern attraverso modello linguistico
- **Lookback**: ${counts.feeds} feed RSS e ${counts.subreddits} subreddit negli ultimi ${report.lookbackDays} giorni

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
