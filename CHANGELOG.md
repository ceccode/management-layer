# Changelog

## [Unreleased]

### Fixed
- "Temi della settimana" was empty in every LLM-generated report: the section
  parser stopped at the first `###` sub-heading
- JSON reports listed three hard-coded themes instead of the ones of the week
- Past themes and divergences never reached the historical (RAG) context
- Reddit posts with no comments got no engagement score
- The methodology section always said "7 giorni" whatever `lookbackDays` was
- Keywords matched inside unrelated words ("cto" in "factory")
- Three of the eleven feeds failed on every run: Harvard Business Review and
  Google Cloud Blog had moved, InfoQ rejected the request headers
- Atom feeds with a namespace prefix and feeds with relative links are now read

### Changed
- The analysis is written by `gpt-6.2-sol` instead of `gpt-4o-mini`. The request
  sends `max_completion_tokens` (the newer models reject `max_tokens`), the
  budget is 2000 tokens, and `temperature` is optional and no longer set
- A warning is logged when the LLM answer is cut off at the token budget
- Without an LLM analysis (disabled, failed, or an answer with none of the
  expected sections) the report says so and lists what was collected. It no
  longer publishes generic themes, signals and divergences as if they were
  the week's analysis; empty sections are left out
- The Telegram message lists the week's theme titles instead of three fixed
  lines, and tries shorter layouts before dropping the community section
- Reddit posts and Hacker News stories are "discussions": in the JSON report
  `type` is `discussion`, `subreddit` became `community`, `itemsTopReddit`
  became `itemsTopDiscussions`, `counts.reddit`/`counts.subreddits` became
  `counts.discussions`/`counts.communities`
- The divergences section is "Divergenze (Articoli vs Community)" when
  discussions were collected and "Divergenze tra le fonti" otherwise; the LLM
  is no longer asked to compare articles with discussions that were never read
- "Top contenuti" lists articles only; discussions have their own section and
  no longer compete with articles (`itemsTopOverall` now equals `itemsTopArticles`,
  `scoringVersion` is `2.2.0`)
- `counts.communities` counts only the communities actually switched on
- Reddit's weekly listing asks for the top posts of the week (it asked for the day's)
- URLs keep the parameters that identify a page; only tracking ones are dropped
- Source `weight` now multiplies the score of an item (it was configured but ignored);
  items in the JSON report carry their `weight`, and `scoringVersion` is `2.0.0`
- The top lists take at most 3 items from the same source
- `ragWeeks` in `config/llm.json` now sets the RAG lookback; `--rag-k` overrides it
- `--date` now also sets the instant recency and lookback are measured from
- Invalid `--date` and `--rag-k` values are rejected instead of silently accepted
- LLM requests time out after two minutes
- Report titles are HTML-escaped in `index.html`

### Added
- Hacker News as a community source: stories of the week whose title matches
  the terms in `config/hackernews.json` (`--no-hn` skips it)
- Reddit is read again, through application-only OAuth: it needs
  `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`, no username or password
- Vitest test suite (`npm test`), run in CI before a report is generated

## [1.0.0] - 2024-12-31

### Added
- Hacker News as a community source: stories of the week whose title matches
  the terms in `config/hackernews.json` (`--no-hn` skips it)
- Reddit is read again, through application-only OAuth: it needs
  `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`, no username or password
- Initial implementation of The Management Layer
- RSS feed collection from 11 editorial sources
- Reddit API integration for 6 subreddits
- Deterministic scoring algorithm (recency + keywords + engagement)
- RAG context building from historical reports
- LLM integration with Italian editorial prompts
- Report generators: Markdown, Telegram, JSON
- Manifest and index.html generation
- GitHub Actions workflow for automated weekly reports
- GitHub Pages deployment support
- Complete documentation in README.md

### Features
- Multi-source content aggregation
- Robust error handling (failed sources don't break pipeline)
- CLI with --date, --no-reddit, --no-llm, --rag-k options
- Fallback content generation when LLM unavailable
- Archive mode for historical reports
- File-first architecture (no database)
