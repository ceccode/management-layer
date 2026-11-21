import { describe, expect, it } from 'vitest';
import { generateReportJson } from '../src/render/reportJson.js';
import { generateReportMarkdown } from '../src/render/reportMarkdown.js';
import { generateTelegramMarkdown } from '../src/render/telegramMarkdown.js';
import { parseAnalysis } from '../src/report/sections.js';
import { anArticle, aRedditPost, aReport } from './fixtures.js';

const article = anArticle({ title: 'Systems thinking', url: 'https://example.com/systems', source: 'LeadDev' });
const post = aRedditPost({ title: 'A thread', subreddit: 'ExperiencedDevs', upvotes: 120, commentsCount: 30 });
const selected = { topOverall: [article], topReddit: [post], topArticles: [article] };

describe('generateReportJson', () => {
  const json = generateReportJson(aReport({ selected }));

  it('lists the theme titles', () => {
    expect(json.llm.themes).toEqual(['Governance del codice', 'Produttività']);
  });

  it('lists no themes when the analysis has none, instead of inventing them', () => {
    const report = aReport({ analysis: { ...aReport().analysis, themes: '' } });

    expect(generateReportJson(report).llm.themes).toEqual([]);
  });

  it('lists signals and divergences as plain bullets', () => {
    expect(json.llm.signals).toEqual(['primo segnale', 'secondo segnale']);
    expect(json.llm.divergences).toEqual(['una divergenza']);
  });

  it('points to the three published files of the week', () => {
    expect(json.paths).toEqual({
      markdown: 'reports/2026-11-16.management-layer.md',
      telegram: 'telegram/2026-11-16.management-layer.telegram.md',
      json: 'data/2026-11-16.management-layer.json',
    });
  });

  it('carries the selected items and the counts', () => {
    expect(json.itemsTopOverall).toEqual([article]);
    expect(json.itemsTopReddit).toEqual([post]);
    expect(json.counts).toEqual({ articles: 25, reddit: 0, feeds: 11, subreddits: 6 });
    expect(json.methodology.lookbackDays).toBe(7);
  });
});

describe('generateReportMarkdown', () => {
  const markdown = generateReportMarkdown(aReport({ selected }));

  it('opens with the frontmatter and the title', () => {
    expect(markdown.startsWith('---\ntitle: "The Management Layer — 2026-11-16"\ndate: 2026-11-16\n')).toBe(true);
    expect(markdown).toContain('# The Management Layer — 2026-11-16');
  });

  it('links the top items with their source', () => {
    expect(markdown).toContain('1. **[Systems thinking](https://example.com/systems)**');
    expect(markdown).toContain('📰 LeadDev');
  });

  it('includes every analysis section under its heading', () => {
    expect(markdown).toContain('## Executive Summary\n\nSintesi della settimana.');
    expect(markdown).toContain('## Temi della settimana\n\n### 1) Governance del codice');
    expect(markdown).toContain('## Segnali da monitorare\n\n- primo segnale');
    expect(markdown).toContain('## Divergenze (Articoli vs Reddit)\n\n• una divergenza');
  });

  it('shows reddit discussions only when there are some', () => {
    expect(markdown).toContain('- **r/ExperiencedDevs**: [A thread]');

    const withoutReddit = generateReportMarkdown(aReport({ selected: { ...selected, topReddit: [] } }));
    expect(withoutReddit).not.toContain('## Top discussioni Reddit');
  });

  it('states the configured lookback window', () => {
    const report = aReport({ selected, lookbackDays: 14 });

    expect(generateReportMarkdown(report)).toContain('negli ultimi 14 giorni');
  });

  it('can be read back: the analysis survives a round trip through the published report', () => {
    expect(parseAnalysis(markdown)).toEqual(aReport().analysis);
  });
});

describe('generateTelegramMarkdown', () => {
  it('lists at most five top items with their source', () => {
    const items = Array.from({ length: 7 }, (_, i) => anArticle({ title: `Item ${i + 1}` }));

    const message = generateTelegramMarkdown(aReport({ selected: { topOverall: items, topReddit: [], topArticles: items } }));

    expect(message).toContain('*The Management Layer — 2026-11-16*');
    expect(message).toContain('5. [Item 5](https://example.com/article) — Example');
    expect(message).not.toContain('Item 6');
  });

  it('falls back to three items without sources when the message is too long', () => {
    const longTitle = 'x'.repeat(200);
    const longUrl = `https://example.com/${'y'.repeat(200)}`;
    const items = Array.from({ length: 5 }, () => anArticle({ title: longTitle, url: longUrl }));

    const message = generateTelegramMarkdown(aReport({ selected: { topOverall: items, topReddit: [], topArticles: items } }));

    expect(message.match(/\]\(https/g)).toHaveLength(3);
    expect(message).not.toContain('— Example');
  });
});
