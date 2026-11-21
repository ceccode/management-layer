import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { JsonReport } from '../render/reportJson.js';
import type { ReportPaths } from '../report/report.js';
import { log } from '../utils/logging.js';
import { truncateText } from '../utils/truncate.js';

const TOP_LINKS = 5;
const EXCERPT_LENGTH = 200;

export interface ReportEntry {
  date: string;
  title: string;
  paths: ReportPaths;
  excerpt: string;
  topLinks: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export interface Manifest {
  generated_at_utc: string;
  version: number;
  latest: {
    date: string;
    paths: ReportPaths;
  } | null;
  reports: ReportEntry[];
}

export function toReportEntry(report: JsonReport): ReportEntry {
  return {
    date: report.date,
    title: report.title,
    paths: report.paths,
    excerpt: truncateText(report.llm.executiveSummary, EXCERPT_LENGTH),
    topLinks: report.itemsTopOverall.slice(0, TOP_LINKS).map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
    })),
  };
}

/** Lists the reports newest first; `latest` points at the first one. */
export function manifestOf(entries: ReportEntry[], generatedAt: Date): Manifest {
  const reports = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [latest] = reports;

  return {
    generated_at_utc: generatedAt.toISOString(),
    version: 1,
    latest: latest ? { date: latest.date, paths: latest.paths } : null,
    reports,
  };
}

async function readReportEntry(jsonPath: string): Promise<ReportEntry | null> {
  try {
    const report = JSON.parse(await readFile(jsonPath, 'utf-8')) as JsonReport;
    return toReportEntry(report);
  } catch (error) {
    log('warn', `Failed to extract metadata from ${jsonPath}:`, error);
    return null;
  }
}

async function readReportEntries(dataDir: string): Promise<ReportEntry[]> {
  if (!existsSync(dataDir)) {
    log('warn', 'No data directory found, creating empty manifest');
    return [];
  }

  const files = await readdir(dataDir);
  const jsonFiles = files.filter(file => file.endsWith('.management-layer.json'));
  const entries = await Promise.all(jsonFiles.map(file => readReportEntry(join(dataDir, file))));

  return entries.filter((entry): entry is ReportEntry => entry !== null);
}

export async function buildManifest(publicDir: string): Promise<Manifest> {
  const entries = await readReportEntries(join(publicDir, 'data'));
  const manifest = manifestOf(entries, new Date());

  await writeFile(join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  log('success', `Generated manifest with ${manifest.reports.length} reports`);

  return manifest;
}
