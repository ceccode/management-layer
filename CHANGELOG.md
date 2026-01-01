# Changelog

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
