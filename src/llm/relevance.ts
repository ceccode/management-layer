import { z } from 'zod';
import type { Item, LLMConfig } from '../config/schema.js';
import { log } from '../utils/logging.js';
import { completeChat } from './chat.js';

const MAX_TOKENS = 4000;

const CURATOR_PROMPT_IT = `Sei il curatore di una newsletter settimanale su come la tecnologia viene guidata e gestita: leadership, engineering management, organizzazione dei team, cultura e pratiche di lavoro nelle organizzazioni software.

Lettori: Engineering Manager, CTO / VP Engineering, founder e tech leader.`;

const JudgementsSchema = z.array(
  z.object({
    n: z.number().int(),
    voto: z.number().int().min(0).max(3),
    motivo: z.string(),
  })
);

function candidateLine(item: Item, index: number): string {
  const heading = `${index + 1}. "${item.title}" (${item.source})`;

  return item.summary ? `${heading}\n   ${item.summary}` : heading;
}

export function buildRelevancePrompt(candidates: Item[]): string {
  return `Valuta la pertinenza di ciascun articolo per questa newsletter, basandoti solo su titolo e sommario.

Voti:
- 3 = tratta direttamente di leadership, management o organizzazione del lavoro tecnico
- 2 = tema tecnico o di business con implicazioni chiare per chi guida team tecnologici
- 1 = legame debole con i temi della newsletter
- 0 = fuori tema: annuncio di prodotto, tutorial tecnico, contenuto promozionale, tema personale

## Articoli
${candidates.map(candidateLine).join('\n')}

Rispondi SOLO con un array JSON, un oggetto per articolo, nello stesso ordine:
[{"n": 1, "voto": 2, "motivo": "una frase che spiega il voto"}]`;
}

/**
 * Reads the model's verdicts and attaches them to the candidates. Every
 * candidate must have one: a partial answer would rank judged and unjudged
 * articles on different scales.
 */
export function applyJudgements(answer: string, candidates: Item[]): Item[] {
  const start = answer.indexOf('[');
  const end = answer.lastIndexOf(']');

  if (start === -1 || end <= start) {
    throw new Error('LLM answer has no JSON array');
  }

  const judgements = JudgementsSchema.parse(JSON.parse(answer.slice(start, end + 1)));
  const byNumber = new Map(judgements.map(judgement => [judgement.n, judgement]));

  return candidates.map((item, index) => {
    const judgement = byNumber.get(index + 1);

    if (!judgement) {
      throw new Error(`LLM answer has no verdict for article ${index + 1}`);
    }

    return { ...item, relevance: judgement.voto, relevanceReason: judgement.motivo.trim() };
  });
}

/**
 * Asks the model how relevant each candidate is to the newsletter. Returns
 * null when there is no usable answer, so that the caller keeps the keyword
 * ranking instead.
 */
export async function judgeRelevance(candidates: Item[], config: LLMConfig): Promise<Item[] | null> {
  if (!config.enabled || candidates.length === 0) {
    return null;
  }

  try {
    log('info', `Asking the LLM to judge the relevance of ${candidates.length} articles...`);
    const answer = await completeChat(
      { system: CURATOR_PROMPT_IT, user: buildRelevancePrompt(candidates), maxTokens: MAX_TOKENS },
      config
    );
    const judged = applyJudgements(answer, candidates);

    const offTopic = judged.filter(item => item.relevance === 0);
    log('success', `Relevance judged: ${offTopic.length} articles off topic`);
    for (const item of offTopic) {
      log('info', `Off topic: "${item.title}" (${item.source}) - ${item.relevanceReason}`);
    }

    return judged;
  } catch (error) {
    log('error', 'Relevance judgement failed, keeping the keyword ranking:', error);
    return null;
  }
}
