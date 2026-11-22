import type { LLMConfig } from '../config/schema.js';
import { hasFindings, parseAnalysis, type Analysis } from '../report/sections.js';
import { SYSTEM_PROMPT_IT, buildUserPrompt, type AnalysisInput } from './prompt_it.js';
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
    log('info', 'LLM disabled, the report will carry no analysis');
    return analysisUnavailable(input);
  }

  try {
    log('info', 'Calling LLM API...');
    const content = await callLLMAPI(SYSTEM_PROMPT_IT, buildUserPrompt(input), config);
    const analysis = parseAnalysis(content);

    if (!analysis.executiveSummary && !hasFindings(analysis)) {
      throw new Error('LLM answer has none of the expected sections');
    }

    log('success', 'LLM content generated successfully');
    return analysis;
  } catch (error) {
    log('error', 'LLM generation failed, the report will carry no analysis:', error);
    return analysisUnavailable(input);
  }
}

/**
 * What a report says when there is no LLM analysis: the facts of the
 * collection, and plainly that the analysis is missing. Themes, signals and
 * divergences are left empty rather than filled with generic text.
 */
export function analysisUnavailable(input: AnalysisInput): Analysis {
  const { counts } = input;

  const collected = counts.discussions > 0
    ? `${counts.articles} articoli da ${counts.feeds} feed e ${counts.discussions} discussioni da ${counts.communities} community`
    : `${counts.articles} articoli da ${counts.feeds} feed`;

  return {
    executiveSummary: `Questa settimana sono stati raccolti ${collected}. L'analisi automatica non è disponibile per questa edizione: il report riporta i contenuti selezionati, senza sintesi dei temi.`,
    themes: '',
    signals: '',
    divergences: '',
  };
}
