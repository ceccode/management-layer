# Changelog

## [Unreleased]

### Fixed
- "Temi della settimana" was empty in every LLM-generated report: the section
  parser stopped at the first `###` sub-heading
- JSON reports listed three hard-coded themes instead of the ones of the week
- Past themes and divergences never reached the historical (RAG) context
- Reddit posts with no comments got no engagement score
- The methodology section always said "7 giorni" whatever `lookbackDays` was

### Changed
- Source `weight` now multiplies the score of an item (it was configured but ignored);
  items in the JSON report carry their `weight`, and `scoringVersion` is `2.0.0`
- `ragWeeks` in `config/llm.json` now sets the RAG lookback; `--rag-k` overrides it
- `--date` now also sets the instant recency and lookback are measured from
- Invalid `--date` and `--rag-k` values are rejected instead of silently accepted
- LLM requests time out after two minutes
- Report titles are HTML-escaped in `index.html`

### Added
- Vitest test suite (`npm test`), run in CI before a report is generated

## [1.0.0] - 2024-12-31

### Added
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
