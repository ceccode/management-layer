# The Management Layer

**How technology is actually led**

A weekly automated report aggregating high-signal content on leadership, engineering management, and tech organizations. Combines editorial content from RSS feeds with community discussions from Reddit, analyzed through LLM to identify patterns and weak signals.

## Features

- **Multi-source aggregation**: RSS feeds from curated editorial sources + Reddit discussions
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

Edit `.env` and add your credentials (all optional):

```bash
# Reddit API (optional - if missing, RSS-only mode)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
REDDIT_USER_AGENT=ManagementLayer/1.0

# LLM API (optional - if missing, fallback to deterministic content)
LLM_API_KEY=your_openai_api_key
LLM_API_URL=https://api.openai.com/v1/chat/completions
```

### Build and Run

```bash
# Build TypeScript
npm run build

# Generate report for today
npm run generate

# Generate report for specific date
npm run generate -- --date 2024-12-31

# Generate without Reddit
npm run generate -- --no-reddit

# Generate without LLM
npm run generate -- --no-llm

# Custom RAG lookback (default 4 weeks)
npm run generate -- --rag-k 8
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

**For Reddit** (optional):
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`
- `REDDIT_USER_AGENT`

**For LLM** (optional):
- `LLM_API_KEY`
- `LLM_API_URL`

If secrets are not configured, the workflow will run in RSS-only mode with fallback content.

### 3. Trigger

The workflow runs:
- **Automatically**: Every Monday at 7:00 AM UTC
- **Manually**: Via "Actions" → "Generate and Publish Report" → "Run workflow"

## Project Structure

```
config/
  feeds.json           # RSS feed sources
  subreddits.json      # Reddit sources
  keywords.json        # Scoring keywords
  llm.json            # LLM configuration

src/
  config/             # Config loading and schemas
  collect/            # RSS and Reddit ingestion
  normalize/          # Deduplication and normalization
  score/              # Scoring algorithm
  rag/                # RAG context building
  llm/                # LLM integration (Italian prompts)
  render/             # Report generators
  publish/            # Manifest and public directory
  utils/              # Utilities
  main.ts             # CLI entry point

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

### Reddit Communities (6 subreddits)
- r/EngineeringManagement
- r/ExperiencedDevs
- r/cto
- r/leadership
- r/devops
- r/startups

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

### Why RSS + Reddit?
- RSS: Editorial quality, expert perspectives
- Reddit: Community discussions, practitioner viewpoints
- Combination provides balance between strategic and operational

### Why Italian for LLM Output?
- Target audience: Italian tech leaders
- Reduces content homogenization (English tech content is saturated)
- Editorial differentiation

### Why Deterministic Scoring?
- Reproducible and debuggable
- No black-box recommendations
- KISS principle

## Limitations

- Sample limited to configured sources
- RSS-dependent (feeds can break)
- Reddit reflects English-speaking tech communities
- LLM analysis may contain subjective interpretations
- Weekly cadence may miss fast-moving topics

## Disclaimer

This content is purely informational and analytical. It does not constitute professional, managerial, or career advice.

## License

MIT

## Contributing

Issues and PRs welcome. Please keep the KISS principle in mind.

---

**The Management Layer** - Analyzing how technology is actually led.
