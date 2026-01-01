import type { Item } from '../config/schema.js';
import type { KeywordsConfig } from '../config/schema.js';
import { log } from '../utils/logging.js';

interface ScoringWeights {
  recencyLessThan24h: number;
  recencyLessThan3d: number;
  recencyLessThan7d: number;
  keywordMatch: number;
  redditUpvotesDivisor: number;
  redditCommentsDivisor: number;
  redditEngagementCap: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  recencyLessThan24h: 3.0,
  recencyLessThan3d: 1.5,
  recencyLessThan7d: 0.5,
  keywordMatch: 0.8,
  redditUpvotesDivisor: 50,
  redditCommentsDivisor: 20,
  redditEngagementCap: 5.0,
};

function getRecencyScore(publishedAt: string, now: Date = new Date()): number {
  const published = new Date(publishedAt);
  const ageMs = now.getTime() - published.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  if (ageHours < 24) {
    return DEFAULT_WEIGHTS.recencyLessThan24h;
  } else if (ageHours < 72) {
    return DEFAULT_WEIGHTS.recencyLessThan3d;
  } else if (ageHours < 168) {
    return DEFAULT_WEIGHTS.recencyLessThan7d;
  }
  
  return 0;
}

function getKeywordScore(title: string, keywords: string[]): number {
  const titleLower = title.toLowerCase();
  let matches = 0;
  
  for (const keyword of keywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return matches * DEFAULT_WEIGHTS.keywordMatch;
}

function getRedditEngagementScore(item: Item): number {
  if (item.type !== 'reddit' || !item.upvotes || !item.commentsCount) {
    return 0;
  }
  
  const upvoteScore = item.upvotes / DEFAULT_WEIGHTS.redditUpvotesDivisor;
  const commentScore = item.commentsCount / DEFAULT_WEIGHTS.redditCommentsDivisor;
  const rawScore = upvoteScore + commentScore;
  
  return Math.min(rawScore, DEFAULT_WEIGHTS.redditEngagementCap);
}

export function scoreItems(items: Item[], keywordsConfig: KeywordsConfig): Item[] {
  const scoredItems = items.map(item => {
    let score = 0;
    
    score += getRecencyScore(item.publishedAt);
    score += getKeywordScore(item.title, keywordsConfig.keywords);
    score += getRedditEngagementScore(item);
    
    return {
      ...item,
      score,
    };
  });
  
  log('info', `Scored ${scoredItems.length} items`);
  return scoredItems;
}

export interface SelectedItems {
  topOverall: Item[];
  topReddit: Item[];
  topArticles: Item[];
}

export function selectTopItems(items: Item[], topN = 10, topRedditN = 5): SelectedItems {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  
  const topOverall = sorted.slice(0, topN);
  
  const redditItems = sorted.filter(item => item.type === 'reddit');
  const topReddit = redditItems.slice(0, topRedditN);
  
  const articleItems = sorted.filter(item => item.type === 'article');
  const topArticles = articleItems.slice(0, topN);
  
  log('info', `Selected top ${topOverall.length} overall, ${topReddit.length} reddit, ${topArticles.length} articles`);
  
  return {
    topOverall,
    topReddit,
    topArticles,
  };
}
