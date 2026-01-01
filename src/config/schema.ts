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

export const KeywordsConfigSchema = z.object({
  keywords: z.array(z.string()),
});

export const LLMConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string(),
  model: z.string(),
  maxTokens: z.number(),
  temperature: z.number(),
  ragWeeks: z.number(),
  maxRagWords: z.number(),
});

export const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  type: z.enum(['article', 'reddit']),
  score: z.number(),
  tags: z.array(z.string()),
  subreddit: z.string().optional(),
  upvotes: z.number().optional(),
  commentsCount: z.number().optional(),
});

export type Feed = z.infer<typeof FeedSchema>;
export type FeedsConfig = z.infer<typeof FeedsConfigSchema>;
export type Subreddit = z.infer<typeof SubredditSchema>;
export type SubredditsConfig = z.infer<typeof SubredditsConfigSchema>;
export type KeywordsConfig = z.infer<typeof KeywordsConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type Item = z.infer<typeof ItemSchema>;
