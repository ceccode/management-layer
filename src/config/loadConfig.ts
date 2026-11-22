import { readFile } from 'fs/promises';
import { join } from 'path';
import type { z } from 'zod';
import {
  FeedsConfigSchema,
  SubredditsConfigSchema,
  HackerNewsConfigSchema,
  KeywordsConfigSchema,
  LLMConfigSchema,
  type FeedsConfig,
  type SubredditsConfig,
  type HackerNewsConfig,
  type KeywordsConfig,
  type LLMConfig,
} from './schema.js';
import { redditCredentials } from '../collect/reddit.js';
import { log } from '../utils/logging.js';

const CONFIG_DIR = join(process.cwd(), 'config');

async function loadConfigFile<Schema extends z.ZodTypeAny>(
  filename: string,
  schema: Schema
): Promise<z.infer<Schema>> {
  const content = await readFile(join(CONFIG_DIR, filename), 'utf-8');
  return schema.parse(JSON.parse(content));
}

async function loadLLMConfig(): Promise<LLMConfig> {
  const config = await loadConfigFile('llm.json', LLMConfigSchema);

  if (config.enabled && !process.env.LLM_API_KEY) {
    log('warn', 'LLM_API_KEY not found in environment. LLM will be disabled.');
    return { ...config, enabled: false };
  }

  return config;
}

async function loadSubredditsConfig(): Promise<SubredditsConfig> {
  const config = await loadConfigFile('subreddits.json', SubredditsConfigSchema);

  if (config.enabled && !redditCredentials()) {
    log('warn', 'REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not found in environment. Reddit will be skipped.');
    return { ...config, enabled: false };
  }

  return config;
}

export interface Config {
  feeds: FeedsConfig;
  subreddits: SubredditsConfig;
  hackerNews: HackerNewsConfig;
  keywords: KeywordsConfig;
  llm: LLMConfig;
}

export async function loadAllConfigs(): Promise<Config> {
  const [feeds, subreddits, hackerNews, keywords, llm] = await Promise.all([
    loadConfigFile('feeds.json', FeedsConfigSchema),
    loadSubredditsConfig(),
    loadConfigFile('hackernews.json', HackerNewsConfigSchema),
    loadConfigFile('keywords.json', KeywordsConfigSchema),
    loadLLMConfig(),
  ]);

  return { feeds, subreddits, hackerNews, keywords, llm };
}
