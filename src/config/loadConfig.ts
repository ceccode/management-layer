import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  FeedsConfigSchema,
  SubredditsConfigSchema,
  KeywordsConfigSchema,
  LLMConfigSchema,
  type FeedsConfig,
  type SubredditsConfig,
  type KeywordsConfig,
  type LLMConfig,
} from './schema.js';
import { log } from '../utils/logging.js';

const CONFIG_DIR = join(process.cwd(), 'config');

export async function loadFeedsConfig(): Promise<FeedsConfig> {
  const path = join(CONFIG_DIR, 'feeds.json');
  const content = await readFile(path, 'utf-8');
  const data = JSON.parse(content);
  return FeedsConfigSchema.parse(data);
}

export async function loadSubredditsConfig(): Promise<SubredditsConfig> {
  const path = join(CONFIG_DIR, 'subreddits.json');
  const content = await readFile(path, 'utf-8');
  const data = JSON.parse(content);
  return SubredditsConfigSchema.parse(data);
}

export async function loadKeywordsConfig(): Promise<KeywordsConfig> {
  const path = join(CONFIG_DIR, 'keywords.json');
  const content = await readFile(path, 'utf-8');
  const data = JSON.parse(content);
  return KeywordsConfigSchema.parse(data);
}

export async function loadLLMConfig(): Promise<LLMConfig> {
  const path = join(CONFIG_DIR, 'llm.json');
  const content = await readFile(path, 'utf-8');
  const data = JSON.parse(content);
  const config = LLMConfigSchema.parse(data);
  
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey && config.enabled) {
    log('warn', 'LLM_API_KEY not found in environment. LLM will be disabled.');
    return { ...config, enabled: false };
  }
  
  return config;
}

export interface Config {
  feeds: FeedsConfig;
  subreddits: SubredditsConfig;
  keywords: KeywordsConfig;
  llm: LLMConfig;
}

export async function loadAllConfigs(): Promise<Config> {
  const [feeds, subreddits, keywords, llm] = await Promise.all([
    loadFeedsConfig(),
    loadSubredditsConfig(),
    loadKeywordsConfig(),
    loadLLMConfig(),
  ]);
  
  return { feeds, subreddits, keywords, llm };
}
