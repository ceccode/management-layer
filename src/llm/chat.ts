import type { LLMConfig } from '../config/schema.js';
import { log } from '../utils/logging.js';

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
}

export interface ChatRequest {
  system: string;
  user: string;
  maxTokens: number;
}

/** Sends one question to the configured chat model and returns its answer. */
export async function completeChat(request: ChatRequest, config: LLMConfig): Promise<string> {
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
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      max_completion_tokens: request.maxTokens,
      ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  const completion = await response.json() as ChatCompletion;
  const choice = completion.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    throw new Error('LLM API returned no content');
  }

  if (choice?.finish_reason === 'length') {
    log('warn', `LLM answer was cut off at ${request.maxTokens} tokens and may be incomplete.`);
  }

  return content;
}
