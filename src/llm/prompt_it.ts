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

export interface LLMInputData {
  weekDate: string;
  counts: {
    articles: number;
    reddit: number;
    sources: number;
  };
  topOverall: Array<{
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    type: string;
  }>;
  topReddit: Array<{
    title: string;
    url: string;
    subreddit: string;
    upvotes: number;
    commentsCount: number;
  }>;
  scoringNotes: string;
  ragContext: string;
}

export function buildUserPrompt(data: LLMInputData): string {
  return `# Analisi della settimana: ${data.weekDate}

## Dati raccolti
- Articoli: ${data.counts.articles}
- Discussioni Reddit: ${data.counts.reddit}
- Fonti totali: ${data.counts.sources}

## Top contenuti overall
${data.topOverall.map((item, i) => `${i + 1}. "${item.title}" (${item.source})`).join('\n')}

## Top discussioni Reddit
${data.topReddit.map((item, i) => `${i + 1}. r/${item.subreddit}: "${item.title}" (↑${item.upvotes} 💬${item.commentsCount})`).join('\n')}

## Contesto storico (settimane precedenti)
${data.ragContext || 'Nessun contesto storico disponibile.'}

---

Produci un'analisi strutturata seguendo ESATTAMENTE questo formato:

## Executive Summary
(5–7 righe che sintetizzano la settimana)

## Temi della settimana
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

## Segnali da monitorare
- bullet punto concreto
- bullet punto concreto
- bullet punto concreto

## Divergenze (Articoli vs Reddit)
- bullet: differenza di prospettiva
- bullet: differenza di prospettiva
- bullet: differenza di prospettiva

Note:
- Usa evidenze dai contenuti raccolti
- Non essere prescrittivo
- Massimo 3 temi
- Bullet concreti e specifici, non generici`;
}
