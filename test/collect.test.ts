import { describe, expect, it } from 'vitest';
import Parser from 'rss-parser';
import { recentItemsOf, withUnprefixedAtom } from '../src/collect/rss.js';

const NOW = new Date('2026-11-16T12:00:00.000Z');
const feed = { name: 'LeadDev', url: 'https://leaddev.com/rss.xml', weight: 1.25, tags: ['leadership'] };
const entry = { title: 'Systems thinking', link: 'https://leaddev.com/systems', isoDate: '2026-11-15T08:00:00.000Z' };

describe('recentItemsOf', () => {
  it('labels each entry with the name, tags and weight of its feed', () => {
    expect(recentItemsOf(feed, [entry], 7, NOW)).toEqual([
      {
        title: 'Systems thinking',
        link: 'https://leaddev.com/systems',
        publishedAt: '2026-11-15T08:00:00.000Z',
        source: 'LeadDev',
        summary: '',
        categories: [],
        tags: ['leadership'],
        weight: 1.25,
      },
    ]);
  });

  it('keeps the opening of the description as plain text', () => {
    const described = { ...entry, contentSnippet: '  Systems   thinking\noutlasts frameworks. ' };
    const marked = { ...entry, contentSnippet: undefined, content: '<p>Why <em>teams</em> matter</p>' };
    const long = { ...entry, contentSnippet: 'x'.repeat(1000) };

    const [a, b, c] = recentItemsOf(feed, [described, marked, long], 7, NOW);

    expect(a.summary).toBe('Systems thinking outlasts frameworks.');
    expect(b.summary).toBe('Why teams matter');
    expect(c.summary).toHaveLength(401);
    expect(c.summary.endsWith('…')).toBe(true);
  });

  it('reads categories given as text or as Atom terms', () => {
    const categorised = { ...entry, categories: ['Leadership', { $: { term: 'Career' } }, { _: 'Management' }, '', null] };

    const [item] = recentItemsOf(feed, [categorised], 7, NOW);

    expect(item.categories).toEqual(['Leadership', 'Career', 'Management']);
  });

  it('resolves a relative link against the address of the feed', () => {
    const hbr = { ...feed, url: 'https://hbr.org/resources/xml/atom/latest-abridged.xml' };

    const [item] = recentItemsOf(hbr, [{ ...entry, link: '/2026/11/moving-fast' }], 7, NOW);

    expect(item.link).toBe('https://hbr.org/2026/11/moving-fast');
  });

  it('falls back to pubDate when the entry has no ISO date', () => {
    const [item] = recentItemsOf(feed, [{ ...entry, isoDate: undefined, pubDate: 'Sun, 15 Nov 2026 08:00:00 GMT' }], 7, NOW);

    expect(item.publishedAt).toBe('Sun, 15 Nov 2026 08:00:00 GMT');
  });

  it('skips entries without a title, a link or a date', () => {
    const incomplete = [
      { ...entry, title: undefined },
      { ...entry, link: undefined },
      { ...entry, isoDate: undefined },
    ];

    expect(recentItemsOf(feed, incomplete, 7, NOW)).toEqual([]);
  });

  it('skips sponsored entries, marked in the address or in a category', () => {
    const paidByLink = { ...entry, link: 'https://hbr.org/sponsored/2026/11/ai-without-certainty' };
    const paidByCategory = { ...entry, categories: ['Sponsored Content'] };
    const unrelated = { ...entry, link: 'https://example.com/unsponsored-thoughts' };

    expect(recentItemsOf(feed, [paidByLink, paidByCategory], 7, NOW)).toEqual([]);
    expect(recentItemsOf(feed, [unrelated], 7, NOW)).toHaveLength(1);
  });

  it('skips entries older than the lookback window', () => {
    const old = { ...entry, isoDate: '2026-11-01T08:00:00.000Z' };

    expect(recentItemsOf(feed, [old], 7, NOW)).toEqual([]);
    expect(recentItemsOf(feed, [old], 30, NOW)).toHaveLength(1);
  });
});

describe('withUnprefixedAtom', () => {
  const prefixedAtom = `<?xml version="1.0" encoding="UTF-8"?>
<ns6:feed xmlns:ns6="http://www.w3.org/2005/Atom" xmlns:hbr="http://hbr.org/2014/HbrAtom">
  <ns6:title>HBR CMS</ns6:title>
  <ns6:entry>
    <ns6:title>Moving fast</ns6:title>
    <ns6:link href="/2026/11/moving-fast" rel="alternate" type="text/html"/>
    <ns6:published>2026-11-15T08:00:00Z</ns6:published>
    <hbr:kicker>Strategy</hbr:kicker>
  </ns6:entry>
</ns6:feed>`;

  it('makes a namespace-prefixed Atom feed readable by the parser', async () => {
    const parsed = await new Parser().parseString(withUnprefixedAtom(prefixedAtom));

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toMatchObject({
      title: 'Moving fast',
      link: '/2026/11/moving-fast',
      isoDate: '2026-11-15T08:00:00.000Z',
    });
  });

  it('leaves the elements of other namespaces alone', () => {
    expect(withUnprefixedAtom(prefixedAtom)).toContain('<hbr:kicker>Strategy</hbr:kicker>');
  });

  it('leaves an RSS feed that merely uses Atom links untouched', () => {
    const rss = `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<atom:link href="https://example.com/feed" rel="self"/><item><title>A</title></item></channel></rss>`;

    expect(withUnprefixedAtom(rss)).toBe(rss);
  });

  it('leaves a plain Atom feed untouched', () => {
    const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>A</title></entry></feed>';

    expect(withUnprefixedAtom(atom)).toBe(atom);
  });
});
