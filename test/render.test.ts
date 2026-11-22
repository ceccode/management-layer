import { describe, expect, it } from 'vitest';
import { generateReportJson } from '../src/render/reportJson.js';
import { generateReportMarkdown } from '../src/render/reportMarkdown.js';
import { generateTelegramMarkdown } from '../src/render/telegramMarkdown.js';
import { parseAnalysis } from '../src/report/sections.js';
import { anArticle, aDiscussion, aReport } from './fixtures.js';

const article = anArticle({ title: 'Systems thinking', url: 'https://example.com/systems', source: 'LeadDev' });
const post = aDiscussion({ title: 'A thread', community: 'r/ExperiencedDevs', upvotes: 120, commentsCount: 30 });
const selected = { topDiscussions: [post], topArticles: [article] };

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
    expect(json.itemsTopArticles).toEqual([article]);
    expect(json.itemsTopDiscussions).toEqual([post]);
    expect(json.counts).toEqual({ articles: 25, discussions: 0, feeds: 11, communities: 6 });
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
    expect(markdown).toContain('## Divergenze (Articoli vs Community)\n\n• una divergenza');
  });

  it('shows community discussions only when there are some', () => {
    expect(markdown).toContain('## Top discussioni delle community');
    expect(markdown).toContain('- **r/ExperiencedDevs**: [A thread]');

    const withoutReddit = generateReportMarkdown(aReport({ selected: { ...selected, topDiscussions: [] } }));
    expect(withoutReddit).not.toContain('## Top discussioni');
  });

  it('compares the sources with each other when there are no discussions to compare with', () => {
    const withoutDiscussions = generateReportMarkdown(aReport({ selected: { ...selected, topDiscussions: [] } }));

    expect(withoutDiscussions).toContain('## Divergenze tra le fonti\n\n• una divergenza');
    expect(withoutDiscussions).not.toContain('Articoli vs');
    expect(parseAnalysis(withoutDiscussions).divergences).toBe('• una divergenza');
  });

  describe('without an analysis', () => {
    const unavailable = { executiveSummary: 'Analisi non disponibile.', themes: '', signals: '', divergences: '' };
    const bare = generateReportMarkdown(aReport({ selected, analysis: unavailable }));

    it('leaves out the sections it has nothing to say in', () => {
      expect(bare).toContain('## Executive Summary\n\nAnalisi non disponibile.');
      expect(bare).not.toContain('## Temi della settimana');
      expect(bare).not.toContain('## Segnali da monitorare');
      expect(bare).not.toContain('## Divergenze');
    });

    it('says in the methodology that the analysis is missing', () => {
      expect(bare).toContain('- **Analisi LLM**: non disponibile per questa edizione');
      expect(bare).not.toContain("L'analisi LLM può contenere interpretazioni soggettive");
      expect(markdown).toContain('- **Analisi LLM**: Sintesi e individuazione pattern');
    });
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
  const longUrl = (i: number) => `https://example.com/${i}/${'y'.repeat(300)}`;

  it('carries the title, the top articles, the discussions and the themes of the week', () => {
    const message = generateTelegramMarkdown(aReport({ selected }));

    expect(message).toBe([
      '*The Management Layer — 2026-11-16*',
      '*Top contenuti*\n1. [Systems thinking](https://example.com/systems) — LeadDev',
      '*Community*\n• r/ExperiencedDevs — [A thread](https://www.reddit.com/r/test/1) (↑120 💬30)',
      '*Temi della settimana*\n• Governance del codice\n• Produttività',
      '_Disclaimer: contenuto informativo. Nessuna consulenza._',
    ].join('\n\n'));
  });

  it('lists at most five articles and three discussions', () => {
    const articles = Array.from({ length: 7 }, (_, i) => anArticle({ title: `Item ${i + 1}` }));
    const discussions = Array.from({ length: 5 }, (_, i) => aDiscussion({ title: `Thread ${i + 1}` }));

    const message = generateTelegramMarkdown(aReport({ selected: { topArticles: articles, topDiscussions: discussions } }));

    expect(message).toContain('5. [Item 5](https://example.com/article) — Example');
    expect(message).not.toContain('Item 6');
    expect(message).toContain('Thread 3');
    expect(message).not.toContain('Thread 4');
  });

  it('has no themes section when the report has no analysis', () => {
    const analysis = { executiveSummary: 'Analisi non disponibile.', themes: '', signals: '', divergences: '' };

    const message = generateTelegramMarkdown(aReport({ selected, analysis }));

    expect(message).not.toContain('Temi della settimana');
    expect(message).not.toContain('In sintesi');
  });

  it('drops sources and shortens titles before it drops the discussions', () => {
    const articles = Array.from({ length: 5 }, (_, i) =>
      anArticle({ title: 'x'.repeat(100), url: `https://example.com/${i}/${'y'.repeat(100)}` })
    );

    const message = generateTelegramMarkdown(aReport({ selected: { topArticles: articles, topDiscussions: [post] } }));

    expect(message.length).toBeLessThanOrEqual(1200);
    expect(message).not.toContain('— Example');
    expect(message).toContain('*Community*');
  });

  it('falls back to three articles alone when nothing else fits', () => {
    const articles = Array.from({ length: 5 }, (_, i) => anArticle({ title: 'x'.repeat(200), url: longUrl(i) }));

    const message = generateTelegramMarkdown(aReport({ selected: { topArticles: articles, topDiscussions: [post] } }));

    expect(message.match(/\]\(https:\/\/example/g)).toHaveLength(3);
    expect(message).not.toContain('*Community*');
    expect(message).toContain('*Temi della settimana*');
  });
});
