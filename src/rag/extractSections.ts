import { parseAnalysis, renderAnalysis } from '../report/sections.js';

/** Keeps only the analysis sections of a published report. */
export function extractLLMSections(markdownContent: string): string {
  return renderAnalysis(parseAnalysis(markdownContent));
}
