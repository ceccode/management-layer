import type { Item } from '../config/schema.js';
import type { ReportCounts } from '../report/report.js';
import { SECTION_TITLES, divergencesHeading } from '../report/sections.js';

export const SYSTEM_PROMPT_IT = `Sei un analista editoriale specializzato in leadership, engineering management e organizzazioni tecnologiche.

Scrivi per:
- Engineering Manager
- CTO / VP Engineering
- Founder e tech leader

Obiettivo: individuare pattern, tensioni ricorrenti e segnali deboli su come la tecnologia viene guidata e gestita.

Vincoli:
- Non dare consigli professionali/manageriali/career.
- Non prescrivere azioni ("dovresti", "bisogna", "è necessario").
- Non fare previsioni.
- Non usare tono motivazionale o hype.

Stile: analitico, sobrio, concreto, orientato a evidenze.
Lingua: italiano.`;

export interface AnalysisInput {
  weekDate: string;
  counts: ReportCounts;
  topArticles: Item[];
  topDiscussions: Item[];
  ragContext: string;
}

export function sourcesCount(counts: ReportCounts): number {
  return counts.feeds + counts.communities;
}

function articleLine(item: Item, index: number): string {
  const heading = `${index + 1}. "${item.title}" (${item.source})`;

  return item.summary ? `${heading}\n   ${item.summary}` : heading;
}

function discussionLine(item: Item, index: number): string {
  return `${index + 1}. ${item.community ?? item.source}: "${item.title}" (↑${item.upvotes ?? 0} 💬${item.commentsCount ?? 0})`;
}

/**
 * Without discussions there is nothing to set the articles against, so the
 * model is asked how the sources diverge from each other instead of being
 * left to imagine what a community might have said.
 */
function divergencesRequest(hasDiscussions: boolean): string {
  const bullet = hasDiscussions
    ? '- bullet: differenza di prospettiva tra articoli e discussioni delle community'
    : '- bullet: punto su cui le fonti raccolte divergono o si contraddicono';

  return [`## ${divergencesHeading(hasDiscussions)}`, bullet, bullet, bullet].join('\n');
}

export function buildUserPrompt(data: AnalysisInput): string {
  const hasDiscussions = data.topDiscussions.length > 0;

  return `# Analisi della settimana: ${data.weekDate}

## Dati raccolti
- Articoli: ${data.counts.articles}
- Discussioni delle community: ${data.counts.discussions}
- Fonti totali: ${sourcesCount(data.counts)}

## Top articoli
${data.topArticles.map(articleLine).join('\n')}

## Top discussioni delle community
${hasDiscussions ? data.topDiscussions.map(discussionLine).join('\n') : 'Nessuna discussione raccolta questa settimana.'}

## Contesto storico (settimane precedenti)
${data.ragContext || 'Nessun contesto storico disponibile.'}

---

Produci un'analisi strutturata seguendo ESATTAMENTE questo formato:

## ${SECTION_TITLES.executiveSummary}
(5–7 righe che sintetizzano la settimana)

## ${SECTION_TITLES.themes}
### 1) <Titolo tema>
- bullet punto concreto
- bullet punto concreto
- bullet punto concreto

### 2) <Titolo tema>
- bullet punto concreto
- bullet punto concreto
- bullet punto concreto

### 3) <Titolo tema>
- bullet punto concreto
- bullet punto concreto
- bullet punto concreto

## ${SECTION_TITLES.signals}
- bullet punto concreto
- bullet punto concreto
- bullet punto concreto

${divergencesRequest(hasDiscussions)}

Note:
- Usa evidenze dai contenuti raccolti
- Non essere prescrittivo
- Massimo 3 temi
- Bullet concreti e specifici, non generici
- Non attribuire a una fonte o a una community contenuti che non compaiono nei dati raccolti`;
}
