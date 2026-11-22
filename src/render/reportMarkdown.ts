import type { Report } from '../report/report.js';
import { SECTION_TITLES, divergencesHeading, hasFindings } from '../report/sections.js';

export function generateReportMarkdown(report: Report): string {
  const { counts, analysis, selected } = report;
  const hasDiscussions = selected.topDiscussions.length > 0;

  const frontmatter = `---
title: "${report.title}"
date: ${report.weekDate}
scope: "Leadership & Engineering Management"
sources_count:
  articles: ${counts.articles}
  discussions: ${counts.discussions}
  feeds: ${counts.feeds}
  communities: ${counts.communities}
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

${selected.topArticles.map((item, i) => {
  const date = new Date(item.publishedAt).toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  return `${i + 1}. **[${item.title}](${item.url})**  \n   📰 ${item.source} • ${date}`;
}).join('\n\n')}

`;

  const topDiscussionsSection = hasDiscussions ? `## Top discussioni delle community

${selected.topDiscussions.map(item => {
  return `- **${item.community}**: [${item.title}](${item.url})  \n  ↑ ${item.upvotes} • 💬 ${item.commentsCount}`;
}).join('\n\n')}

` : '';

  const themes = analysis.themes ? `## ${SECTION_TITLES.themes}

${analysis.themes}

` : '';

  const signals = analysis.signals ? `## ${SECTION_TITLES.signals}

${analysis.signals}

` : '';

  const divergences = analysis.divergences ? `## ${divergencesHeading(hasDiscussions)}

${analysis.divergences}

` : '';

  const methodology = `## Metodologia e limitazioni

Questo report è generato attraverso:
- **Raccolta dati**: Analisi di feed RSS da fonti editoriali selezionate e discussioni da community (Reddit, Hacker News)
- **Scoring deterministico**: Algoritmo basato su keyword matching, recency e engagement (per le discussioni), con un massimo di 3 contenuti per fonte
${selected.topArticles.some(item => item.relevance !== undefined) ? '- **Selezione degli articoli**: i contenuti con punteggio più alto sono valutati per pertinenza dal modello linguistico; quelli fuori tema sono esclusi\n' : ''}${hasFindings(analysis) ? '- **Analisi LLM**: Sintesi e individuazione pattern attraverso modello linguistico\n' : '- **Analisi LLM**: non disponibile per questa edizione\n'}- **Lookback**: ${counts.feeds} feed RSS e ${counts.communities} community negli ultimi ${report.lookbackDays} giorni

**Limitazioni**:
- Il campione è limitato alle fonti configurate
- Possibili bias nella selezione editoriale delle fonti
- Le discussioni delle community riflettono la prospettiva delle community tech anglofone
${hasFindings(analysis) ? "- L'analisi LLM può contenere interpretazioni soggettive\n" : ''}
`;

  const footer = `---

**Disclaimer**: Questo contenuto ha scopo puramente informativo e di analisi. Non costituisce consulenza professionale, manageriale o di carriera. Le opinioni espresse nei contenuti citati appartengono ai rispettivi autori.

`;

  return frontmatter + header + executiveSummary + topContents + topDiscussionsSection + themes + signals + divergences + methodology + footer;
}
