import { describe, expect, it } from 'vitest';
import { generateLLMContent } from '../src/llm/generate.js';
import { buildUserPrompt, type AnalysisInput } from '../src/llm/prompt_it.js';
import { parseAnalysis, SECTION_TITLES } from '../src/report/sections.js';
import { anArticle } from './fixtures.js';

const input: AnalysisInput = {
  weekDate: '2026-11-16',
  counts: { articles: 25, reddit: 0, feeds: 11, subreddits: 6 },
  topOverall: [anArticle({ title: 'Systems thinking', source: 'LeadDev' })],
  topReddit: [],
  ragContext: '',
};

const disabled = {
  enabled: false,
  provider: 'openai_compatible',
  model: 'gpt-4o-mini',
  maxTokens: 900,
  temperature: 0.4,
  ragWeeks: 4,
  maxRagWords: 2000,
};

describe('buildUserPrompt', () => {
  const prompt = buildUserPrompt(input);

  it('presents the week, its numbers and its top items', () => {
    expect(prompt).toContain('# Analisi della settimana: 2026-11-16');
    expect(prompt).toContain('- Articoli: 25');
    expect(prompt).toContain('- Fonti totali: 17');
    expect(prompt).toContain('1. "Systems thinking" (LeadDev)');
  });

  it('says when there is no historical context', () => {
    expect(prompt).toContain('Nessun contesto storico disponibile.');
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
  it('uses the fallback content, with the real counts, when the LLM is disabled', async () => {
    const analysis = await generateLLMContent(input, disabled);

    expect(analysis.executiveSummary).toContain('25 articoli e 0 discussioni Reddit da 17 fonti');
    expect(analysis.themes).toContain('### 1) Engineering Management e Leadership');
    expect(analysis.signals).not.toBe('');
    expect(analysis.divergences).not.toBe('');
  });
});
