import type { Item } from '../config/schema.js';
import type { ReportCounts } from '../report/report.js';
import { SECTION_TITLES } from '../report/sections.js';

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
  topOverall: Item[];
  topReddit: Item[];
  ragContext: string;
}

export function sourcesCount(counts: ReportCounts): number {
  return counts.feeds + counts.subreddits;
}

export function buildUserPrompt(data: AnalysisInput): string {
  return `# Analisi della settimana: ${data.weekDate}

## Dati raccolti
- Articoli: ${data.counts.articles}
- Discussioni Reddit: ${data.counts.reddit}
- Fonti totali: ${sourcesCount(data.counts)}

## Top contenuti overall
${data.topOverall.map((item, i) => `${i + 1}. "${item.title}" (${item.source})`).join('\n')}

## Top discussioni Reddit
${data.topReddit.map((item, i) => `${i + 1}. r/${item.subreddit ?? ''}: "${item.title}" (↑${item.upvotes ?? 0} 💬${item.commentsCount ?? 0})`).join('\n')}

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

## ${SECTION_TITLES.divergences}
- bullet: differenza di prospettiva
- bullet: differenza di prospettiva
- bullet: differenza di prospettiva

Note:
- Usa evidenze dai contenuti raccolti
- Non essere prescrittivo
- Massimo 3 temi
- Bullet concreti e specifici, non generici`;
}
