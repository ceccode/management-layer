import type { LLMConfig } from '../config/schema.js';
import { hasFindings, parseAnalysis, type Analysis } from '../report/sections.js';
import { SYSTEM_PROMPT_IT, buildUserPrompt, type AnalysisInput } from './prompt_it.js';
import { log } from '../utils/logging.js';
import { completeChat } from './chat.js';


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
    const content = await completeChat(
      { system: SYSTEM_PROMPT_IT, user: buildUserPrompt(input), maxTokens: config.maxTokens },
      config
    );
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
