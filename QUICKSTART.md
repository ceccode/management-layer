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

To enable LLM features:

1. Copy `.env.example` to `.env`
2. Add your LLM credentials (OpenAI API key or compatible endpoint)

## Deploy to GitHub Pages

1. Push your repo to GitHub
2. Go to Settings → Pages → Source: GitHub Actions
3. (Optional) Add LLM secret: Settings → Secrets and variables → Actions
   - `LLM_API_KEY`
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
- Pipeline will fall back to deterministic content (this is normal)

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
