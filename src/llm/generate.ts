import type { LLMConfig } from '../config/schema.js';
import { SYSTEM_PROMPT_IT, buildUserPrompt, type LLMInputData } from './prompt_it.js';
import { log } from '../utils/logging.js';

interface LLMResponse {
  executiveSummary: string;
  themes: string;
  signals: string;
  divergences: string;
  fullContent: string;
}

async function callLLMAPI(
  systemPrompt: string,
  userPrompt: string,
  config: LLMConfig
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  
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
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }
  
  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  
  return data.choices[0].message.content;
}

function parseLLMResponse(content: string): LLMResponse {
  const executiveSummaryMatch = content.match(/## Executive Summary\s*([\s\S]*?)(?=##|$)/i);
  const themesMatch = content.match(/## Temi della settimana\s*([\s\S]*?)(?=##|$)/i);
  const signalsMatch = content.match(/## Segnali da monitorare\s*([\s\S]*?)(?=##|$)/i);
  const divergencesMatch = content.match(/## Divergenze \(Articoli vs Reddit\)\s*([\s\S]*?)(?=##|$)/i);
  
  return {
    executiveSummary: executiveSummaryMatch ? executiveSummaryMatch[1].trim() : '',
    themes: themesMatch ? themesMatch[1].trim() : '',
    signals: signalsMatch ? signalsMatch[1].trim() : '',
    divergences: divergencesMatch ? divergencesMatch[1].trim() : '',
    fullContent: content,
  };
}

export async function generateLLMContent(
  data: LLMInputData,
  config: LLMConfig
): Promise<LLMResponse> {
  if (!config.enabled) {
    log('info', 'LLM disabled, using fallback content');
    return generateFallbackContent(data);
  }
  
  try {
    log('info', 'Calling LLM API...');
    const userPrompt = buildUserPrompt(data);
    const content = await callLLMAPI(SYSTEM_PROMPT_IT, userPrompt, config);
    const parsed = parseLLMResponse(content);
    
    log('success', 'LLM content generated successfully');
    return parsed;
  } catch (error) {
    log('error', 'LLM generation failed, using fallback:', error);
    return generateFallbackContent(data);
  }
}

function generateFallbackContent(data: LLMInputData): LLMResponse {
  const executiveSummary = `Questa settimana sono stati analizzati ${data.counts.articles} articoli e ${data.counts.reddit} discussioni Reddit da ${data.counts.sources} fonti diverse. I contenuti raccolti coprono tematiche di leadership tecnologica, engineering management e organizzazione dei team di sviluppo.`;
  
  const themes = `### 1) Engineering Management e Leadership
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
- Reliability e operational excellence`;
  
  const signals = `- Crescente attenzione a developer productivity e delivery metrics
- Discussioni su ownership e decision making distribuito
- Focus su reliability e incident response`;
  
  const divergences = `- Le discussioni Reddit tendono a enfatizzare aspetti operativi quotidiani
- Gli articoli editoriali privilegiano visioni strategiche di lungo periodo
- Differenze di prospettiva tra individual contributor e manager`;
  
  return {
    executiveSummary,
    themes,
    signals,
    divergences,
    fullContent: `## Executive Summary\n${executiveSummary}\n\n## Temi della settimana\n${themes}\n\n## Segnali da monitorare\n${signals}\n\n## Divergenze (Articoli vs Reddit)\n${divergences}`,
  };
}
