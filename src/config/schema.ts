import { z } from 'zod';

export const FeedSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  weight: z.number(),
  tags: z.array(z.string()),
});

export const FeedsConfigSchema = z.object({
  lookbackDays: z.number(),
  feeds: z.array(FeedSchema),
});

export const SubredditSchema = z.object({
  name: z.string(),
  weight: z.number(),
  tags: z.array(z.string()),
});

export const SubredditsConfigSchema = z.object({
  enabled: z.boolean(),
  limitPerSubreddit: z.number(),
  sortModes: z.array(z.string()),
  subreddits: z.array(SubredditSchema),
});

export const HackerNewsConfigSchema = z.object({
  enabled: z.boolean(),
  weight: z.number(),
  tags: z.array(z.string()),
  minPoints: z.number(),
  hitsPerQuery: z.number(),
  queries: z.array(z.string()),
});

export const KeywordsConfigSchema = z.object({
  keywords: z.array(z.string()),
});

export const LLMConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  model: z.string(),
  maxTokens: z.number(),
  /** Left out for models that only accept their default temperature. */
  temperature: z.number().optional(),
  ragWeeks: z.number(),
  maxRagWords: z.number(),
  /** How many of the best-scored articles the LLM judges for relevance; 0 keeps the keyword ranking. */
  rerankCandidates: z.number().int().min(0).default(30),
});

export const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  type: z.enum(['article', 'discussion']),
  score: z.number(),
  weight: z.number(),
  tags: z.array(z.string()),
  community: z.string().optional(),
  /** What the source says the item is about; read for relevance and by the LLM, never published. */
  summary: z.string().optional(),
  categories: z.array(z.string()).optional(),
  /** The LLM's verdict on how relevant the article is to the newsletter, 0 (off topic) to 3. */
  relevance: z.number().optional(),
  relevanceReason: z.string().optional(),
  upvotes: z.number().optional(),
  commentsCount: z.number().optional(),
});

export type Feed = z.infer<typeof FeedSchema>;
export type FeedsConfig = z.infer<typeof FeedsConfigSchema>;
export type Subreddit = z.infer<typeof SubredditSchema>;
export type SubredditsConfig = z.infer<typeof SubredditsConfigSchema>;
export type HackerNewsConfig = z.infer<typeof HackerNewsConfigSchema>;
export type KeywordsConfig = z.infer<typeof KeywordsConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type Item = z.infer<typeof ItemSchema>;
