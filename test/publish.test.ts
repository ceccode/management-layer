import { describe, expect, it } from 'vitest';
import { renderIndexHtml } from '../src/publish/buildPublic.js';
import { manifestOf, toReportEntry, type ReportEntry } from '../src/publish/manifest.js';
import { generateReportJson } from '../src/render/reportJson.js';
import { anArticle, aReport } from './fixtures.js';

const GENERATED_AT = new Date('2026-11-16T07:00:00.000Z');

function anEntry(date: string): ReportEntry {
  return toReportEntry(generateReportJson(aReport({ weekDate: date, title: `The Management Layer — ${date}` })));
}

describe('toReportEntry', () => {
  it('summarises a report with a short excerpt and its first five links', () => {
    const items = Array.from({ length: 7 }, (_, i) => anArticle({ title: `Item ${i + 1}` }));
    const analysis = { ...aReport().analysis, executiveSummary: 'x'.repeat(300) };
    const report = aReport({ analysis, selected: { topOverall: items, topReddit: [], topArticles: items } });

    const entry = toReportEntry(generateReportJson(report));

    expect(entry.excerpt).toHaveLength(200);
    expect(entry.topLinks.map(link => link.title)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
    expect(entry.topLinks[0]).toEqual({ title: 'Item 1', url: 'https://example.com/article', source: 'Example' });
  });
});

describe('manifestOf', () => {
  it('lists reports newest first and points to the latest', () => {
    const manifest = manifestOf([anEntry('2026-11-02'), anEntry('2026-11-16'), anEntry('2026-11-09')], GENERATED_AT);

    expect(manifest.reports.map(report => report.date)).toEqual(['2026-11-16', '2026-11-09', '2026-11-02']);
    expect(manifest.latest).toEqual({
      date: '2026-11-16',
      paths: {
        markdown: 'reports/2026-11-16.management-layer.md',
        telegram: 'telegram/2026-11-16.management-layer.telegram.md',
        json: 'data/2026-11-16.management-layer.json',
      },
    });
    expect(manifest.generated_at_utc).toBe('2026-11-16T07:00:00.000Z');
  });

  it('has no latest report when there are none', () => {
    expect(manifestOf([], GENERATED_AT)).toMatchObject({ latest: null, reports: [] });
  });
});

describe('renderIndexHtml', () => {
  it('links the latest report and the recent ones', () => {
    const html = renderIndexHtml(manifestOf([anEntry('2026-11-09'), anEntry('2026-11-16')], GENERATED_AT));

    expect(html).toContain('<strong>Latest Report:</strong> <a href="reports/2026-11-16.management-layer.md">2026-11-16</a>');
    expect(html).toContain('<li><a href="reports/2026-11-09.management-layer.md">2026-11-09</a> - The Management Layer — 2026-11-09</li>');
  });

  it('lists at most ten reports', () => {
    const entries = Array.from({ length: 12 }, (_, i) => anEntry(`2026-01-${String(i + 1).padStart(2, '0')}`));

    const html = renderIndexHtml(manifestOf(entries, GENERATED_AT));

    expect(html.match(/<li><a href="reports\//g)).toHaveLength(10);
  });

  it('says so when there are no reports', () => {
    const html = renderIndexHtml(manifestOf([], GENERATED_AT));

    expect(html).toContain('<p>No reports available yet.</p>');
    expect(html).toContain('<li>No reports available yet.</li>');
  });

  it('escapes report titles', () => {
    const entry = { ...anEntry('2026-11-16'), title: '<script>alert("x")</script>' };

    const html = renderIndexHtml(manifestOf([entry], GENERATED_AT));

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
});
