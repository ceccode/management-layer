import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateLLMContent } from '../src/llm/generate.js';
import { buildUserPrompt, type AnalysisInput } from '../src/llm/prompt_it.js';
import { parseAnalysis, SECTION_TITLES } from '../src/report/sections.js';
import { anArticle, aDiscussion } from './fixtures.js';

const input: AnalysisInput = {
  weekDate: '2026-11-16',
  counts: { articles: 25, discussions: 0, feeds: 11, communities: 6 },
  topArticles: [anArticle({ title: 'Systems thinking', source: 'LeadDev' })],
  topDiscussions: [],
  ragContext: '',
};

const disabled = {
  enabled: false,
  provider: 'openai_compatible',
  model: 'gpt-6.2-sol',
  maxTokens: 2000,
  ragWeeks: 4,
  maxRagWords: 2000,
  rerankCandidates: 30,
};

describe('buildUserPrompt', () => {
  const prompt = buildUserPrompt(input);

  it('presents the week, its numbers and its top items', () => {
    expect(prompt).toContain('# Analisi della settimana: 2026-11-16');
    expect(prompt).toContain('- Articoli: 25');
    expect(prompt).toContain('- Fonti totali: 17');
    expect(prompt).toContain('1. "Systems thinking" (LeadDev)');
  });

  it('gives the summary of an article under its title, when there is one', () => {
    const described = anArticle({ title: 'Flat velocity', source: 'LeadDev', summary: 'Why tools are not the bottleneck.' });

    const withSummary = buildUserPrompt({ ...input, topArticles: [described] });

    expect(withSummary).toContain('1. "Flat velocity" (LeadDev)\n   Why tools are not the bottleneck.');
  });

  it('says when there is no historical context', () => {
    expect(prompt).toContain('Nessun contesto storico disponibile.');
  });

  it('asks how the sources diverge when no discussion was collected', () => {
    expect(prompt).toContain('Nessuna discussione raccolta questa settimana.');
    expect(prompt).toContain('## Divergenze tra le fonti');
    expect(prompt).not.toContain('Articoli vs');
  });

  it('asks how articles and communities diverge when there are discussions', () => {
    const discussion = aDiscussion({ title: 'A thread', community: 'Hacker News', upvotes: 120, commentsCount: 30 });

    const withDiscussions = buildUserPrompt({ ...input, topDiscussions: [discussion] });

    expect(withDiscussions).toContain('1. Hacker News: "A thread" (↑120 💬30)');
    expect(withDiscussions).toContain('## Divergenze (Articoli vs Community)');
    expect(withDiscussions).not.toContain('Divergenze tra le fonti');
  });

  it('asks for exactly the sections the report parser reads back', () => {
    const requestedFormat = prompt.slice(prompt.indexOf('ESATTAMENTE'));
    const parsed = parseAnalysis(requestedFormat);

    for (const title of Object.values(SECTION_TITLES)) {
      expect(requestedFormat).toContain(`## ${title}`);
    }
    expect(parsed.themes).toContain('### 1) <Titolo tema>');
    expect(parsed.signals).not.toBe('');
    expect(parsed.divergences).not.toBe('');
  });
});

describe('generateLLMContent', () => {
  const enabled = { ...disabled, enabled: true };

  function answering(content: string | undefined, status = 200): typeof fetch {
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

  it('returns the sections the LLM wrote', async () => {
    vi.stubGlobal('fetch', answering('## Executive Summary\nSintesi.\n\n## Temi della settimana\n### 1) Tema\n- punto\n\n## Segnali da monitorare\n- segnale\n\n## Divergenze tra le fonti\n- divergenza'));

    expect(await generateLLMContent(input, enabled)).toEqual({
      executiveSummary: 'Sintesi.',
      themes: '### 1) Tema\n- punto',
      signals: '- segnale',
      divergences: '- divergenza',
    });
  });

  it('sends the model, the limits and both prompts', async () => {
    const fetchMock = answering('## Executive Summary\nSintesi.');
    vi.stubGlobal('fetch', fetchMock);

    await generateLLMContent(input, enabled);

    const [, request] = vi.mocked(fetchMock).mock.calls[0];
    const body = JSON.parse(request?.body as string);
    expect(body).toMatchObject({ model: 'gpt-6.2-sol', max_completion_tokens: 2000 });
    expect(body).not.toHaveProperty('max_tokens');
    expect(body.messages.map((message: { role: string }) => message.role)).toEqual(['system', 'user']);
  });

  it('sends a temperature only when one is configured', async () => {
    const fetchMock = answering('## Executive Summary\nSintesi.');
    vi.stubGlobal('fetch', fetchMock);

    await generateLLMContent(input, enabled);
    await generateLLMContent(input, { ...enabled, temperature: 0.4 });

    const bodies = vi.mocked(fetchMock).mock.calls.map(([, request]) => JSON.parse(request?.body as string));
    expect(bodies[0]).not.toHaveProperty('temperature');
    expect(bodies[1].temperature).toBe(0.4);
  });

  describe('when there is no analysis', () => {
    it('says so and states only what was collected, when the LLM is disabled', async () => {
      const analysis = await generateLLMContent(input, disabled);

      expect(analysis.executiveSummary).toContain('25 articoli da 11 feed');
      expect(analysis.executiveSummary).toContain("L'analisi automatica non è disponibile");
      expect(analysis).toMatchObject({ themes: '', signals: '', divergences: '' });
    });

    it('counts the discussions when some were collected', async () => {
      const counts = { articles: 25, discussions: 6, feeds: 11, communities: 1 };

      const analysis = await generateLLMContent({ ...input, counts }, disabled);

      expect(analysis.executiveSummary).toContain('25 articoli da 11 feed e 6 discussioni da 1 community');
    });

    it('does not invent themes when the LLM request fails', async () => {
      vi.stubGlobal('fetch', answering('rate limited', 429));

      expect(await generateLLMContent(input, enabled)).toMatchObject({ themes: '', signals: '', divergences: '' });
    });

    it('does not publish an answer that has none of the expected sections', async () => {
      vi.stubGlobal('fetch', answering('Mi dispiace, non posso aiutarti.'));

      const analysis = await generateLLMContent(input, enabled);

      expect(analysis.executiveSummary).toContain("L'analisi automatica non è disponibile");
    });

    it('does not publish an empty answer', async () => {
      vi.stubGlobal('fetch', answering(undefined));

      expect((await generateLLMContent(input, enabled)).themes).toBe('');
    });
  });
});
