import { describe, expect, it } from 'vitest';
import { extractLLMSections } from '../src/rag/extractSections.js';
import { extractSection, parseAnalysis } from '../src/report/sections.js';

const report = `---
title: "The Management Layer"
---

# The Management Layer

## Executive Summary

Una settimana dedicata all'IA.

## Top contenuti della settimana

1. **[Un articolo](https://example.com)**

## Temi della settimana

### 1) Governance del codice
- primo punto
- secondo punto

### 2) Produttività
- terzo punto

## Segnali da monitorare

- un segnale

## Divergenze (Articoli vs Reddit)

- una divergenza

## Metodologia e limitazioni

Testo fisso.
`;

describe('extractLLMSections', () => {
  it('keeps the analysis sections and drops the rest of the report', () => {
    const extracted = extractLLMSections(report);

    expect(extracted).toContain('## Executive Summary\nUna settimana dedicata all\'IA.');
    expect(extracted).toContain('## Segnali da monitorare\n- un segnale');
    expect(extracted).toContain('## Divergenze (Articoli vs Reddit)\n- una divergenza');
    expect(extracted).not.toContain('Top contenuti');
    expect(extracted).not.toContain('Metodologia');
  });

  it('keeps the themes with their sub-headings and bullets', () => {
    const extracted = extractLLMSections(report);

    expect(extracted).toContain('### 1) Governance del codice\n- primo punto\n- secondo punto');
    expect(extracted).toContain('### 2) Produttività\n- terzo punto');
  });

  it('returns nothing when the report has no analysis sections', () => {
    expect(extractLLMSections('# Solo un titolo\n\nTesto.')).toBe('');
  });
});

describe('extractSection', () => {
  it('reads a section up to the next second-level heading', () => {
    expect(extractSection(report, 'Segnali da monitorare')).toBe('- un segnale');
  });

  it('does not stop at third-level headings', () => {
    expect(extractSection(report, 'Temi della settimana')).toBe(
      '### 1) Governance del codice\n- primo punto\n- secondo punto\n\n### 2) Produttività\n- terzo punto'
    );
  });

  it('reads the last section up to the end of the text', () => {
    expect(extractSection('## Segnali da monitorare\n- ultimo', 'Segnali da monitorare')).toBe('- ultimo');
  });

  it('matches the heading whatever its case', () => {
    expect(extractSection('## EXECUTIVE SUMMARY\nTesto.', 'Executive Summary')).toBe('Testo.');
  });

  it('is empty when the section is missing', () => {
    expect(extractSection(report, 'Sezione inesistente')).toBe('');
  });
});

describe('parseAnalysis', () => {
  it('splits an LLM answer into its four sections', () => {
    const answer = [
      '## Executive Summary',
      'Sintesi.',
      '',
      '## Temi della settimana',
      '### 1) Primo tema',
      '- punto',
      '',
      '## Segnali da monitorare',
      '- segnale',
      '',
      '## Divergenze (Articoli vs Reddit)',
      '- divergenza',
    ].join('\n');

    expect(parseAnalysis(answer)).toEqual({
      executiveSummary: 'Sintesi.',
      themes: '### 1) Primo tema\n- punto',
      signals: '- segnale',
      divergences: '- divergenza',
    });
  });
});
