import type { LLMConfig } from '../config/schema.js';
import { parseAnalysis, type Analysis } from '../report/sections.js';
import { SYSTEM_PROMPT_IT, buildUserPrompt, sourcesCount, type AnalysisInput } from './prompt_it.js';
import { log } from '../utils/logging.js';

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
}

async function callLLMAPI(
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || DEFAULT_API_URL;

  if (!apiKey) {
    throw new Error('LLM_API_KEY not found');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const completion = await response.json() as ChatCompletion;
  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM API returned no content');
  }

  return content;
}

export async function generateLLMContent(
  input: AnalysisInput,
  config: LLMConfig
): Promise<Analysis> {
  if (!config.enabled) {
    log('info', 'LLM disabled, using fallback content');
    return generateFallbackContent(input);
  }

  try {
    log('info', 'Calling LLM API...');
    const content = await callLLMAPI(SYSTEM_PROMPT_IT, buildUserPrompt(input), config);
    const analysis = parseAnalysis(content);

    log('success', 'LLM content generated successfully');
    return analysis;
  } catch (error) {
    log('error', 'LLM generation failed, using fallback:', error);
    return generateFallbackContent(input);
  }
}

export function generateFallbackContent(input: AnalysisInput): Analysis {
  const { counts } = input;

  return {
    executiveSummary: `Questa settimana sono stati analizzati ${counts.articles} articoli e ${counts.discussions} discussioni delle community da ${sourcesCount(counts)} fonti diverse. I contenuti raccolti coprono tematiche di leadership tecnologica, engineering management e organizzazione dei team di sviluppo.`,

    themes: `### 1) Engineering Management e Leadership
- Discussioni sulla gestione di team distribuiti e ownership
- Tematiche legate alla delivery velocity e developer productivity
- Pattern organizzativi emergenti

### 2) Pratiche e Processi
- Performance review e career ladder
- On-call e incident management
- Comunicazione e alignment organizzativo

### 3) Cultura e Organizzazione
- Team topology e platform team
- Hiring e onboarding
- Reliability e operational excellence`,

    signals: `- Crescente attenzione a developer productivity e delivery metrics
- Discussioni su ownership e decision making distribuito
- Focus su reliability e incident response`,

    divergences: `- Le discussioni delle community tendono a enfatizzare aspetti operativi quotidiani
- Gli articoli editoriali privilegiano visioni strategiche di lungo periodo
- Differenze di prospettiva tra individual contributor e manager`,
  };
}
