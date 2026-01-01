import { loadAllConfigs } from './config/loadConfig.js';
import { collectRSS } from './collect/rss.js';
import { collectReddit } from './collect/reddit.js';
import { normalizeRSSItems, normalizeRedditItems } from './normalize/normalize.js';
import { deduplicateItems } from './normalize/dedupe.js';
import { scoreItems, selectTopItems } from './score/score.js';
import { buildRAGContext } from './rag/buildRag.js';
import { generateLLMContent } from './llm/generate.js';
import type { LLMInputData } from './llm/prompt_it.js';
import { generateReportMarkdown } from './render/reportMarkdown.js';
import { generateTelegramMarkdown } from './render/telegramMarkdown.js';
import { generateReportJson } from './render/reportJson.js';
import { buildPublicDirectory } from './publish/buildPublic.js';
import { formatDate } from './utils/date.js';
import { log } from './utils/logging.js';

interface CLIOptions {
  date: string;
  noReddit: boolean;
  noLlm: boolean;
  ragK: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    date: formatDate(new Date()),
    noReddit: false,
    noLlm: false,
    ragK: 4,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--date' && i + 1 < args.length) {
      options.date = args[i + 1];
      i++;
    } else if (arg === '--no-reddit') {
      options.noReddit = true;
    } else if (arg === '--no-llm') {
      options.noLlm = true;
    } else if (arg === '--rag-k' && i + 1 < args.length) {
      options.ragK = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  return options;
}

async function main() {
  try {
    log('info', '=== The Management Layer - Report Generation ===');
    
    const options = parseArgs();
    log('info', `Generating report for date: ${options.date}`);
    
    log('info', 'Loading configurations...');
    const config = await loadAllConfigs();
    
    if (options.noReddit) {
      config.subreddits.enabled = false;
      log('info', 'Reddit collection disabled via CLI flag');
    }
    
    if (options.noLlm) {
      config.llm.enabled = false;
      log('info', 'LLM generation disabled via CLI flag');
    }
    
    log('info', 'Collecting RSS feeds...');
    const rssItems = await collectRSS(config.feeds);
    
    log('info', 'Collecting Reddit posts...');
    const redditItems = config.subreddits.enabled 
      ? await collectReddit(config.subreddits)
      : [];
    
    if (rssItems.length === 0 && redditItems.length === 0) {
      log('error', 'No items collected from any source. Aborting.');
      process.exit(1);
    }
    
    log('info', 'Normalizing items...');
    const normalizedRSS = normalizeRSSItems(rssItems);
    const normalizedReddit = normalizeRedditItems(redditItems);
    const allItems = [...normalizedRSS, ...normalizedReddit];
    
    log('info', 'Deduplicating items...');
    const dedupedItems = deduplicateItems(allItems);
    
    log('info', 'Scoring items...');
    const scoredItems = scoreItems(dedupedItems, config.keywords);
    
    log('info', 'Selecting top items...');
    const selected = selectTopItems(scoredItems, 10, 5);
    
    log('info', 'Building RAG context...');
    const ragContext = await buildRAGContext(options.ragK, config.llm.maxRagWords);
    
    const llmInputData: LLMInputData = {
      weekDate: options.date,
      counts: {
        articles: normalizedRSS.length,
        reddit: normalizedReddit.length,
        sources: config.feeds.feeds.length + config.subreddits.subreddits.length,
      },
      topOverall: selected.topOverall.map(item => ({
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt,
        type: item.type,
      })),
      topReddit: selected.topReddit.map(item => ({
        title: item.title,
        url: item.url,
        subreddit: item.subreddit || '',
        upvotes: item.upvotes || 0,
        commentsCount: item.commentsCount || 0,
      })),
      scoringNotes: `Scoring based on recency, keyword matching, and engagement metrics`,
      ragContext,
    };
    
    log('info', 'Generating LLM content...');
    const llmContent = await generateLLMContent(llmInputData, config.llm);
    
    log('info', 'Rendering report markdown...');
    const reportMarkdown = generateReportMarkdown({
      weekDate: options.date,
      counts: {
        articles: normalizedRSS.length,
        reddit: normalizedReddit.length,
        feeds: config.feeds.feeds.length,
        subreddits: config.subreddits.subreddits.length,
      },
      topOverall: selected.topOverall,
      topReddit: selected.topReddit,
      llmContent: {
        executiveSummary: llmContent.executiveSummary,
        themes: llmContent.themes,
        signals: llmContent.signals,
        divergences: llmContent.divergences,
      },
    });
    
    log('info', 'Rendering telegram markdown...');
    const telegramMarkdown = generateTelegramMarkdown({
      weekDate: options.date,
      topOverall: selected.topOverall,
      topReddit: selected.topReddit,
    });
    
    log('info', 'Generating JSON report...');
    const jsonReport = generateReportJson({
      weekDate: options.date,
      title: `The Management Layer — ${options.date}`,
      counts: {
        articles: normalizedRSS.length,
        reddit: normalizedReddit.length,
        feeds: config.feeds.feeds.length,
        subreddits: config.subreddits.subreddits.length,
      },
      topOverall: selected.topOverall,
      topReddit: selected.topReddit,
      topArticles: selected.topArticles,
      llmContent: {
        executiveSummary: llmContent.executiveSummary,
        themes: llmContent.themes,
        signals: llmContent.signals,
        divergences: llmContent.divergences,
      },
      lookbackDays: config.feeds.lookbackDays,
    });
    
    log('info', 'Building public directory...');
    await buildPublicDirectory({
      weekDate: options.date,
      markdownContent: reportMarkdown,
      telegramContent: telegramMarkdown,
      jsonContent: JSON.stringify(jsonReport, null, 2),
    });
    
    log('success', '=== Report generation completed successfully ===');
    log('info', `Report generated for: ${options.date}`);
    log('info', `Total items processed: ${allItems.length}`);
    log('info', `Top items selected: ${selected.topOverall.length}`);
    
  } catch (error) {
    log('error', 'Report generation failed:', error);
    process.exit(1);
  }
}

main();
