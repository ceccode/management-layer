import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyJudgements, buildRelevancePrompt, judgeRelevance } from '../src/llm/relevance.js';
import { anArticle } from './fixtures.js';

const config = {
  enabled: true,
  provider: 'openai_compatible',
  model: 'gpt-6.2-sol',
  maxTokens: 2000,
  ragWeeks: 4,
  maxRagWords: 2000,
  rerankCandidates: 30,
};

const coaching = anArticle({ id: 'coaching', title: 'How to coach engineers', source: 'LeadDev', summary: 'Coaching across backgrounds.' });
const spark = anArticle({ id: 'spark', title: 'What is new in Spark 4.0', source: 'Google Cloud Blog' });
const candidates = [coaching, spark];

const verdicts = JSON.stringify([
  { n: 1, voto: 3, motivo: 'Tratta direttamente di coaching.' },
  { n: 2, voto: 0, motivo: 'Annuncio di prodotto.' },
]);

describe('buildRelevancePrompt', () => {
  const prompt = buildRelevancePrompt(candidates);

  it('numbers the candidates and gives their source and summary', () => {
    expect(prompt).toContain('1. "How to coach engineers" (LeadDev)\n   Coaching across backgrounds.');
    expect(prompt).toContain('2. "What is new in Spark 4.0" (Google Cloud Blog)');
  });

  it('explains the four grades and asks for JSON only', () => {
    for (const grade of ['- 3 =', '- 2 =', '- 1 =', '- 0 =']) {
      expect(prompt).toContain(grade);
    }
    expect(prompt).toContain('Rispondi SOLO con un array JSON');
  });
});

describe('applyJudgements', () => {
  it('attaches each verdict and its reason to its article', () => {
    const judged = applyJudgements(verdicts, candidates);

    expect(judged.map(item => [item.id, item.relevance, item.relevanceReason])).toEqual([
      ['coaching', 3, 'Tratta direttamente di coaching.'],
      ['spark', 0, 'Annuncio di prodotto.'],
    ]);
  });

  it('matches verdicts by number, whatever their order', () => {
    const reversed = JSON.stringify(JSON.parse(verdicts).reverse());

    expect(applyJudgements(reversed, candidates).map(item => item.relevance)).toEqual([3, 0]);
  });

  it('reads the array even when the model wraps it in text or a code fence', () => {
    const wrapped = `Ecco la valutazione:\n\`\`\`json\n${verdicts}\n\`\`\``;

    expect(applyJudgements(wrapped, candidates).map(item => item.relevance)).toEqual([3, 0]);
  });

  it('rejects an answer that leaves an article without a verdict', () => {
    const partial = JSON.stringify([{ n: 1, voto: 3, motivo: 'ok' }]);

    expect(() => applyJudgements(partial, candidates)).toThrow('no verdict for article 2');
  });

  it('rejects a grade outside 0-3 and an answer with no array', () => {
    const outOfRange = JSON.stringify([{ n: 1, voto: 7, motivo: 'x' }, { n: 2, voto: 0, motivo: 'y' }]);

    expect(() => applyJudgements(outOfRange, candidates)).toThrow();
    expect(() => applyJudgements('Non posso valutare.', candidates)).toThrow('no JSON array');
  });
});

describe('judgeRelevance', () => {
  function answering(content: string, status = 200): typeof fetch {
    return vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })
    ) as unknown as typeof fetch;
  }

  beforeEach(() => {
    vi.stubEnv('LLM_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns the candidates with the verdicts of the model', async () => {
    vi.stubGlobal('fetch', answering(verdicts));

    const judged = await judgeRelevance(candidates, config);

    expect(judged?.map(item => item.relevance)).toEqual([3, 0]);
  });

  it('gives no verdict when the LLM is disabled, without calling it', async () => {
    const fetchMock = answering(verdicts);
    vi.stubGlobal('fetch', fetchMock);

    expect(await judgeRelevance(candidates, { ...config, enabled: false })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gives no verdict when there is nothing to judge', async () => {
    expect(await judgeRelevance([], config)).toBeNull();
  });

  it('gives no verdict when the request fails or the answer is unusable', async () => {
    vi.stubGlobal('fetch', answering('error', 500));
    expect(await judgeRelevance(candidates, config)).toBeNull();

    vi.stubGlobal('fetch', answering('Non posso valutare.'));
    expect(await judgeRelevance(candidates, config)).toBeNull();
  });
});
