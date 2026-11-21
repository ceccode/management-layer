import { parseArgs, type CLIOptions } from './cli.js';
import { loadAllConfigs, type Config } from './config/loadConfig.js';
import type { Item } from './config/schema.js';
import { collectRSS } from './collect/rss.js';
import { collectReddit } from './collect/reddit.js';
import { normalizeRSSItems, normalizeRedditItems } from './normalize/normalize.js';
import { deduplicateItems } from './normalize/dedupe.js';
import { scoreItems, selectTopItems } from './score/score.js';
import { buildRAGContext } from './rag/buildRag.js';
import { generateLLMContent } from './llm/generate.js';
import { reportTitle, type Report, type ReportCounts } from './report/report.js';
import { generateReportMarkdown } from './render/reportMarkdown.js';
import { generateTelegramMarkdown } from './render/telegramMarkdown.js';
import { generateReportJson } from './render/reportJson.js';
import { buildPublicDirectory } from './publish/buildPublic.js';
import { log } from './utils/logging.js';

const TOP_ITEMS = 10;
const TOP_REDDIT_ITEMS = 5;

function applyCliOverrides(config: Config, options: CLIOptions): Config {
  if (options.noReddit) {
    log('info', 'Reddit collection disabled via CLI flag');
  }

  if (options.noLlm) {
    log('info', 'LLM generation disabled via CLI flag');
  }

  return {
    ...config,
    subreddits: { ...config.subreddits, enabled: config.subreddits.enabled && !options.noReddit },
    llm: {
      ...config.llm,
      enabled: config.llm.enabled && !options.noLlm,
      ragWeeks: options.ragK ?? config.llm.ragWeeks,
    },
  };
}

interface Collected {
  articles: Item[];
  redditPosts: Item[];
}

async function collect(config: Config, now: Date): Promise<Collected> {
  log('info', 'Collecting RSS feeds...');
  const rssItems = await collectRSS(config.feeds, now);

  log('info', 'Collecting Reddit posts...');
  const redditItems = config.subreddits.enabled ? await collectReddit(config.subreddits) : [];

  if (rssItems.length === 0 && redditItems.length === 0) {
    throw new Error('No items collected from any source');
  }

  log('info', 'Normalizing items...');
  return {
    articles: normalizeRSSItems(rssItems),
    redditPosts: normalizeRedditItems(redditItems),
  };
}

function countSources(collected: Collected, config: Config): ReportCounts {
  return {
    articles: collected.articles.length,
    reddit: collected.redditPosts.length,
    feeds: config.feeds.feeds.length,
    subreddits: config.subreddits.subreddits.length,
  };
}

async function buildReport(options: CLIOptions, config: Config): Promise<Report> {
  const collected = await collect(config, options.referenceTime);
  const counts = countSources(collected, config);

  log('info', 'Deduplicating items...');
  const items = deduplicateItems([...collected.articles, ...collected.redditPosts]);

  log('info', 'Scoring items...');
  const scoredItems = scoreItems(items, config.keywords.keywords, options.referenceTime);

  log('info', 'Selecting top items...');
  const selected = selectTopItems(scoredItems, TOP_ITEMS, TOP_REDDIT_ITEMS);

  log('info', 'Building RAG context...');
  const ragContext = await buildRAGContext(config.llm.ragWeeks, config.llm.maxRagWords);

  log('info', 'Generating LLM content...');
  const analysis = await generateLLMContent(
    {
      weekDate: options.date,
      counts,
      topOverall: selected.topOverall,
      topReddit: selected.topReddit,
      ragContext,
    },
    config.llm
  );

  return {
    weekDate: options.date,
    title: reportTitle(options.date),
    counts,
    selected,
    analysis,
    lookbackDays: config.feeds.lookbackDays,
  };
}

async function publish(report: Report): Promise<void> {
  log('info', 'Rendering report...');
  const markdownContent = generateReportMarkdown(report);
  const telegramContent = generateTelegramMarkdown(report);
  const jsonContent = JSON.stringify(generateReportJson(report), null, 2);

  log('info', 'Building public directory...');
  await buildPublicDirectory({
    weekDate: report.weekDate,
    markdownContent,
    telegramContent,
    jsonContent,
  });
}

async function main(): Promise<void> {
  log('info', '=== The Management Layer - Report Generation ===');

  const options = parseArgs(process.argv.slice(2), new Date());
  log('info', `Generating report for date: ${options.date}`);

  log('info', 'Loading configurations...');
  const config = applyCliOverrides(await loadAllConfigs(), options);

  const report = await buildReport(options, config);
  await publish(report);

  log('success', '=== Report generation completed successfully ===');
  log('info', `Report generated for: ${report.weekDate}`);
  log('info', `Total items processed: ${report.counts.articles + report.counts.reddit}`);
  log('info', `Top items selected: ${report.selected.topOverall.length}`);
}

// Exit explicitly: rss-parser can leave a connection open after a redirect,
// which would keep the process alive long after the report is written.
main().then(
  () => process.exit(0),
  error => {
    log('error', 'Report generation failed:', error);
    process.exit(1);
  }
);
