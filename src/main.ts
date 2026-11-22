import { parseArgs, type CLIOptions } from './cli.js';
import { loadAllConfigs, type Config } from './config/loadConfig.js';
import type { Item } from './config/schema.js';
import { collectRSS } from './collect/rss.js';
import { collectReddit } from './collect/reddit.js';
import { collectHackerNews } from './collect/hackernews.js';
import { normalizeRSSItems, normalizeDiscussions } from './normalize/normalize.js';
import { deduplicateItems } from './normalize/dedupe.js';
import { scoreItems, selectTopItems, shortlistArticles } from './score/score.js';
import { buildRAGContext } from './rag/buildRag.js';
import { generateLLMContent } from './llm/generate.js';
import { judgeRelevance } from './llm/relevance.js';
import { reportTitle, type Report, type ReportCounts } from './report/report.js';
import { generateReportMarkdown } from './render/reportMarkdown.js';
import { generateTelegramMarkdown } from './render/telegramMarkdown.js';
import { generateReportJson } from './render/reportJson.js';
import { buildPublicDirectory } from './publish/buildPublic.js';
import { log } from './utils/logging.js';

const TOP_ITEMS = 10;
const TOP_DISCUSSIONS = 5;
const MAX_ITEMS_PER_SOURCE = 3;
const MAX_CANDIDATES_PER_SOURCE = 6;

function applyCliOverrides(config: Config, options: CLIOptions): Config {
  if (options.noReddit) {
    log('info', 'Reddit collection disabled via CLI flag');
  }

  if (options.noHackerNews) {
    log('info', 'Hacker News collection disabled via CLI flag');
  }

  if (options.noLlm) {
    log('info', 'LLM generation disabled via CLI flag');
  }

  return {
    ...config,
    subreddits: { ...config.subreddits, enabled: config.subreddits.enabled && !options.noReddit },
    hackerNews: { ...config.hackerNews, enabled: config.hackerNews.enabled && !options.noHackerNews },
    llm: {
      ...config.llm,
      enabled: config.llm.enabled && !options.noLlm,
      ragWeeks: options.ragK ?? config.llm.ragWeeks,
    },
  };
}

interface Collected {
  articles: Item[];
  discussions: Item[];
}

async function collect(config: Config, now: Date): Promise<Collected> {
  log('info', 'Collecting RSS feeds...');
  const rssItems = await collectRSS(config.feeds, now);

  const { lookbackDays } = config.feeds;

  log('info', 'Collecting Reddit discussions...');
  const redditPosts = await collectReddit(config.subreddits, lookbackDays, now);

  log('info', 'Collecting Hacker News discussions...');
  const hackerNewsStories = await collectHackerNews(config.hackerNews, lookbackDays, now);

  const discussions = [...redditPosts, ...hackerNewsStories];

  if (rssItems.length === 0 && discussions.length === 0) {
    throw new Error('No items collected from any source');
  }

  log('info', 'Normalizing items...');
  return {
    articles: normalizeRSSItems(rssItems),
    discussions: normalizeDiscussions(discussions),
  };
}

/** Communities that are switched on: every subreddit counts as one, Hacker News as one. */
function communitiesRead(config: Config): number {
  const subreddits = config.subreddits.enabled ? config.subreddits.subreddits.length : 0;
  const hackerNews = config.hackerNews.enabled ? 1 : 0;

  return subreddits + hackerNews;
}

function countSources(collected: Collected, config: Config): ReportCounts {
  return {
    articles: collected.articles.length,
    discussions: collected.discussions.length,
    feeds: config.feeds.feeds.length,
    communities: communitiesRead(config),
  };
}

/**
 * Keywords shortlist the articles and the LLM judges how relevant each one is.
 * With a verdict, only the shortlisted articles stay eligible; without one
 * (LLM off or failed) every article does, ranked by keywords as before.
 */
async function withJudgedArticles(scoredItems: Item[], config: Config): Promise<Item[]> {
  const shortlist = shortlistArticles(scoredItems, config.llm.rerankCandidates, MAX_CANDIDATES_PER_SOURCE);
  const judged = await judgeRelevance(shortlist, config.llm);

  if (!judged) {
    return scoredItems;
  }

  return [...judged, ...scoredItems.filter(item => item.type === 'discussion')];
}

async function buildReport(options: CLIOptions, config: Config): Promise<Report> {
  const collected = await collect(config, options.referenceTime);
  const counts = countSources(collected, config);

  log('info', 'Deduplicating items...');
  const items = deduplicateItems([...collected.articles, ...collected.discussions]);

  log('info', 'Scoring items...');
  const scoredItems = scoreItems(items, config.keywords.keywords, options.referenceTime);

  log('info', 'Selecting top items...');
  const eligible = await withJudgedArticles(scoredItems, config);
  const selected = selectTopItems(eligible, TOP_ITEMS, TOP_DISCUSSIONS, MAX_ITEMS_PER_SOURCE);

  log('info', 'Building RAG context...');
  const ragContext = await buildRAGContext(config.llm.ragWeeks, config.llm.maxRagWords);

  log('info', 'Generating LLM content...');
  const analysis = await generateLLMContent(
    {
      weekDate: options.date,
      counts,
      topArticles: selected.topArticles,
      topDiscussions: selected.topDiscussions,
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
  log('info', `Total items processed: ${report.counts.articles + report.counts.discussions}`);
  log('info', `Top articles selected: ${report.selected.topArticles.length}`);
}

// Exit explicitly, so that a connection left open by a feed cannot keep the
// process alive after the report is written.
main().then(
  () => process.exit(0),
  error => {
    log('error', 'Report generation failed:', error);
    process.exit(1);
  }
);
