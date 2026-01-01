# Quick Start Guide

## First Time Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Generate your first report (RSS-only, no LLM)
npm run generate
```

The report will be generated in `public/` directory.

## View Your Report

Open `public/index.html` in your browser to see the generated report.

## Add API Keys (Optional)

To enable Reddit and LLM features:

1. Copy `.env.example` to `.env`
2. Add your credentials:
   - Reddit: Get credentials from https://www.reddit.com/prefs/apps
   - LLM: Use your OpenAI API key or compatible endpoint

## Deploy to GitHub Pages

1. Push your repo to GitHub
2. Go to Settings → Pages → Source: GitHub Actions
3. Add secrets (Settings → Secrets and variables → Actions):
   - `LLM_API_KEY`
   - Reddit credentials (if needed)
4. Run workflow manually or wait for Monday 7 AM UTC

## Common Commands

```bash
# Generate report for today
npm run generate

# Generate for specific date
npm run generate -- --date 2024-12-31

# Generate without Reddit (RSS-only)
npm run generate -- --no-reddit

# Generate without LLM (deterministic fallback)
npm run generate -- --no-llm

# Clean and rebuild
npm run clean && npm run build
```

## Troubleshooting

**TypeScript errors?**
- Run `npm install` to install all dependencies including type definitions

**No items collected?**
- Check your internet connection
- Some RSS feeds may be temporarily down (this is expected)
- Pipeline will continue with available sources

**LLM not working?**
- Check `LLM_API_KEY` in `.env`
- Pipeline will fall back to deterministic content

**Reddit not working?**
- Check Reddit credentials in `.env`
- Pipeline will continue with RSS-only

## Project Structure

- `config/` - Source configuration (edit to add/remove sources)
- `src/` - TypeScript source code
- `dist/` - Compiled JavaScript (generated)
- `public/` - Generated reports and website (GitHub Pages)
- `reports/` - Archive copies of reports

## Next Steps

1. Customize `config/feeds.json` with your preferred sources
2. Adjust `config/keywords.json` for better scoring
3. Test locally before deploying to GitHub Pages
4. Set up GitHub Actions for weekly automation
