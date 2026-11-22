/**
 * The analysis sections of a report: written by the LLM, rendered in the
 * markdown report, and read back from past reports as historical context.
 * Their headings are defined here and nowhere else.
 */
export const SECTION_TITLES = {
  executiveSummary: 'Executive Summary',
  themes: 'Temi della settimana',
  signals: 'Segnali da monitorare',
  divergences: 'Divergenze',
} as const;

/**
 * The divergences section compares articles with community discussions when
 * there are some, and the sources with each other otherwise. Both headings
 * start with the title above, so either is read back as the same section.
 */
export function divergencesHeading(hasDiscussions: boolean): string {
  return hasDiscussions
    ? `${SECTION_TITLES.divergences} (Articoli vs Community)`
    : `${SECTION_TITLES.divergences} tra le fonti`;
}

export type SectionName = keyof typeof SECTION_TITLES;

export type Analysis = Record<SectionName, string>;

const SECTION_NAMES = Object.keys(SECTION_TITLES) as SectionName[];

function isHeadingOf(line: string, title: string): boolean {
  return line.trim().toLowerCase().startsWith(`## ${title.toLowerCase()}`);
}

function startsAnotherSection(line: string): boolean {
  return /^#{1,2}\s/.test(line);
}

/**
 * Returns the body of a `## title` section, sub-headings (`###`) included,
 * or an empty string when the section is missing.
 */
export function extractSection(markdown: string, title: string): string {
  const lines = markdown.split('\n');
  const headingIndex = lines.findIndex(line => isHeadingOf(line, title));

  if (headingIndex === -1) {
    return '';
  }

  const body = lines.slice(headingIndex + 1);
  const nextSectionIndex = body.findIndex(startsAnotherSection);
  const sectionLines = nextSectionIndex === -1 ? body : body.slice(0, nextSectionIndex);

  return sectionLines.join('\n').trim();
}

export function parseAnalysis(markdown: string): Analysis {
  return {
    executiveSummary: extractSection(markdown, SECTION_TITLES.executiveSummary),
    themes: extractSection(markdown, SECTION_TITLES.themes),
    signals: extractSection(markdown, SECTION_TITLES.signals),
    divergences: extractSection(markdown, SECTION_TITLES.divergences),
  };
}

/** Renders the non-empty analysis sections back to markdown. */
export function renderAnalysis(analysis: Analysis): string {
  return SECTION_NAMES
    .filter(name => analysis[name])
    .map(name => `## ${SECTION_TITLES[name]}\n${analysis[name]}`)
    .join('\n\n');
}
