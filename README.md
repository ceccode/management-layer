# The Management Layer

**How technology is actually led**

A weekly automated report aggregating high-signal content on leadership, engineering management, and tech organizations from curated RSS feeds and community discussions (Reddit, Hacker News), analyzed through LLM to identify patterns and weak signals.

## Features

- **Editorial source aggregation**: RSS feeds from 11 curated high-quality sources
- **Community discussions**: Hacker News stories and, when credentials are set, Reddit posts
- **Deterministic scoring**: Recency, keyword matching, and engagement-based ranking
- **RAG-powered analysis**: Historical context from previous reports
- **Italian editorial content**: LLM-generated analysis in Italian (non-prescriptive, analytical)
- **File-first output**: Markdown reports, Telegram-ready summaries, JSON data
- **GitHub Pages deployment**: Static hosting, zero cost

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/management-layer.git
cd management-layer
npm install
```

### Configuration

Copy the environment example:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials (optional):

```bash
# LLM API (optional - if missing, the report carries no analysis)
LLM_API_KEY=your_openai_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
```

### Reddit (optional)

Reddit is read through its official API, authenticating as an app (no Reddit
username or password):

1. Request API access from Reddit. Since November 2025 (Responsible Builder
   Policy) new apps need Reddit's approval: creating one at
   https://www.reddit.com/prefs/apps without it fails, for example with
   "Max clients have been reached". The request goes through Reddit's
   developer support form
2. Once approved, create a **script** app and put its id and secret in `.env` (and in the repository secrets for GitHub Actions):

```bash
REDDIT_CLIENT_ID=your_app_id
REDDIT_CLIENT_SECRET=your_app_secret
```

Without them Reddit is skipped and the report is built from the other sources.
Hacker News needs no credentials.

### Build and Run

```bash
# Build TypeScript
npm run build

# Generate report for today
npm run generate

# Generate report for specific date
npm run generate -- --date 2024-12-31

# Generate without LLM (the report lists the contents, with no analysis)
npm run generate -- --no-llm

# Skip a community
npm run generate -- --no-reddit --no-hn

# Custom RAG lookback (default: ragWeeks in config/llm.json)
npm run generate -- --rag-k 8
```

`--date` sets both the name of the report and the instant recency and the
lookback window are measured from (the end of that day), so a past date is
ranked the same way every time.

### Test

```bash
npm test            # run the test suite once
npm run test:watch  # re-run on change
npm run typecheck   # type-check sources and tests
```

### Output

Reports are generated in:
- `public/reports/YYYY-MM-DD.management-layer.md` - Full report
- `public/telegram/YYYY-MM-DD.management-layer.telegram.md` - Telegram summary (<1200 chars)
- `public/data/YYYY-MM-DD.management-layer.json` - JSON data
- `public/manifest.json` - Index of all reports
- `public/index.html` - Web interface
- `reports/` - Archive copy

## GitHub Actions Setup

### 1. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Source: **GitHub Actions**

### 2. Configure Secrets (Optional)

Add secrets in **Settings** → **Secrets and variables** → **Actions**:

**For LLM** (optional):
- `LLM_API_KEY`
- `LLM_API_URL`

**For Reddit** (optional):
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`

If not configured, the report lists the selected contents and says that the analysis is not available.

### 3. Trigger

The workflow runs:
- **Automatically**: Every Monday at 7:00 AM UTC
- **Manually**: Via "Actions" → "Generate and Publish Report" → "Run workflow"

## Project Structure

```
config/
  feeds.json           # RSS feed sources
  subreddits.json      # Reddit sources
  hackernews.json      # Hacker News search terms
  keywords.json        # Scoring keywords
  llm.json            # LLM configuration

src/
  config/             # Config loading and schemas
  collect/            # RSS, Reddit and Hacker News ingestion
  normalize/          # Deduplication and normalization
  score/              # Scoring algorithm
  rag/                # RAG context building
  llm/                # LLM integration (Italian prompts)
  render/             # Report generators
  publish/            # Manifest and public directory
  report/             # Report model and its analysis sections
  utils/              # Utilities
  cli.ts              # Command-line options
  main.ts             # Pipeline entry point

test/                 # Vitest test suite

public/               # Generated output (GitHub Pages)
  reports/
  telegram/
  data/
  manifest.json
  index.html

reports/              # Archive (optional)
```

## Content Sources

### RSS Feeds (11 sources)
- LeadDev
- Harvard Business Review
- Martin Fowler
- Thoughtworks Insights
- GitHub Blog
- Engineering@Microsoft
- Stripe Blog
- Google Cloud Blog
- InfoQ Articles
- AWS Architecture Blog
- Netflix TechBlog

### Communities
- Hacker News: stories of the week whose title matches one of the terms in `config/hackernews.json`
- Reddit (needs credentials): r/EngineeringManagement, r/ExperiencedDevs and the other subreddits in `config/subreddits.json`

When no discussion is collected, the "Divergenze" section of the report compares
the sources with each other instead of articles with communities.

## Customization

### Add/Remove Sources

Edit `config/feeds.json` or `config/subreddits.json`:

```json
{
  "name": "Source Name",
  "url": "https://example.com/feed.rss",
  "weight": 1.0,
  "tags": ["tag1", "tag2"]
}
```

### How Items Are Scored

```
score = (recency + keyword matches + discussion engagement) × source weight
```

- **Recency**: 3 if published in the last 24 hours, 1.5 in the last 3 days, 0.5 in the last 7 days
- **Keyword matches**: 0.8 for each keyword of `config/keywords.json` that starts a word of the title (`cto` matches "CTOs", not "factory")
- **Discussion engagement** (Reddit, Hacker News): upvotes / 50 + comments / 20, capped at 5
- **Source weight**: the `weight` of the feed or subreddit the item comes from

Articles and discussions are ranked apart, because engagement makes their
scores incomparable: "Top contenuti" lists articles only, and discussions have
their own section. Each list takes at most 3 items from the same source, so
that a prolific source cannot crowd the others out.

### Adjust Keywords

Edit `config/keywords.json` to tune scoring.

### LLM Model

Edit `config/llm.json`:

```json
{
  "model": "gpt-4o-mini",
  "maxTokens": 900,
  "temperature": 0.4
}
```

## Architecture Decisions

### Why File-First?
- No database required
- Git-native versioning
- Easy to archive and query
- Transparent and auditable

### Why RSS-focused?
- Editorial quality and expert perspectives
- Curated sources from respected publications
- Stable, reliable feed infrastructure
- No API access restrictions or rate limits

### Why Italian for LLM Output?
- Target audience: Italian tech leaders
- Reduces content homogenization (English tech content is saturated)
- Editorial differentiation

### Why Deterministic Scoring?
- Reproducible and debuggable
- No black-box recommendations
- KISS principle

## Limitations

- Sample limited to configured RSS sources
- RSS-dependent (feeds can break, but pipeline continues gracefully)
- LLM analysis may contain subjective interpretations
- Weekly cadence may miss fast-moving topics
- Focus on editorial content (no community discussion data)

## Disclaimer

This content is purely informational and analytical. It does not constitute professional, managerial, or career advice.

## License

MIT

## Contributing

Issues and PRs welcome. Please keep the KISS principle in mind.

---

**The Management Layer** - Analyzing how technology is actually led.
