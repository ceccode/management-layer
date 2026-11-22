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
- Relevance now outweighs recency (`scoringVersion` `3.0.0`). Only 1 article
  in 65 matched a keyword, so the ranking was "the newest from the heaviest
  sources". Keywords are also matched against the item's summary, its feed
  categories and the `tags` of its source (which were configured and never
  used); a title match is worth 1, description matches 0.5 each and 1 in all,
  capped at 3. Recency is 1 in the last three days and 0.7 in the rest of the week
- 36 keywords added (management, leadership, coaching, career, velocity, …)
- The LLM reads the summary of each top article, not only its title
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
- The LLM judges the relevance of the 30 best-scored articles (0 to 3, with a
  reason) and the final list follows its grades; off-topic articles are left
  out. Grades and reasons are published in the JSON. The keyword ranking is
  kept when the LLM is off, fails or answers incompletely (`rerankCandidates`
  in `config/llm.json`, 0 to disable)
- Sponsored feed entries are skipped
- Twelve sources on engineering management and leadership: The Pragmatic
  Engineer, Irrational Exuberance, The Engineering Manager, Rands in Repose,
  charity.wtf, Refactoring, Engineering Leadership, Tidy First?, Jacob
  Kaplan-Moss, InfoQ Culture & Methods, MIT Sloan Management Review, Stack
  Overflow Blog
- Articles carry the summary and categories their feed gives them. They are
  read for relevance and given to the LLM, and are not republished in the JSON
- Hacker News as a community source: stories of the week whose title matches
  the terms in `config/hackernews.json` (`--no-hn` skips it)
- Reddit is read again, through application-only OAuth: it needs
  `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`, no username or password
- Vitest test suite (`npm test`), run in CI before a report is generated

## [1.0.0] - 2024-12-31

### Added
- The LLM judges the relevance of the 30 best-scored articles (0 to 3, with a
  reason) and the final list follows its grades; off-topic articles are left
  out. Grades and reasons are published in the JSON. The keyword ranking is
  kept when the LLM is off, fails or answers incompletely (`rerankCandidates`
  in `config/llm.json`, 0 to disable)
- Sponsored feed entries are skipped
- Twelve sources on engineering management and leadership: The Pragmatic
  Engineer, Irrational Exuberance, The Engineering Manager, Rands in Repose,
  charity.wtf, Refactoring, Engineering Leadership, Tidy First?, Jacob
  Kaplan-Moss, InfoQ Culture & Methods, MIT Sloan Management Review, Stack
  Overflow Blog
- Articles carry the summary and categories their feed gives them. They are
  read for relevance and given to the LLM, and are not republished in the JSON
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
