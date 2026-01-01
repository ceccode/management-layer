import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { log } from '../utils/logging.js';
import { truncateText } from '../utils/truncate.js';

interface ReportEntry {
  date: string;
  title: string;
  paths: {
    markdown: string;
    telegram: string;
    json: string;
  };
  excerpt: string;
  topLinks: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

interface Manifest {
  generated_at_utc: string;
  version: number;
  latest: {
    date: string;
    paths: {
      markdown: string;
      telegram: string;
      json: string;
    };
  } | null;
  reports: ReportEntry[];
}

async function extractReportMetadata(jsonPath: string): Promise<ReportEntry | null> {
  try {
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    const topLinks = data.itemsTopOverall.slice(0, 5).map((item: any) => ({
      title: item.title,
      url: item.url,
      source: item.source,
    }));
    
    const excerpt = truncateText(data.llm.executiveSummary, 200);
    
    return {
      date: data.date,
      title: data.title,
      paths: data.paths,
      excerpt,
      topLinks,
    };
  } catch (error) {
    log('warn', `Failed to extract metadata from ${jsonPath}:`, error);
    return null;
  }
}

export async function buildManifest(publicDir: string): Promise<void> {
  const dataDir = join(publicDir, 'data');
  
  if (!existsSync(dataDir)) {
    log('warn', 'No data directory found, creating empty manifest');
    const emptyManifest: Manifest = {
      generated_at_utc: new Date().toISOString(),
      version: 1,
      latest: null,
      reports: [],
    };
    
    const manifestPath = join(publicDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(emptyManifest, null, 2), 'utf-8');
    return;
  }
  
  const files = await readdir(dataDir);
  const jsonFiles = files.filter(f => f.endsWith('.management-layer.json')).sort().reverse();
  
  const reports: ReportEntry[] = [];
  
  for (const file of jsonFiles) {
    const jsonPath = join(dataDir, file);
    const metadata = await extractReportMetadata(jsonPath);
    if (metadata) {
      reports.push(metadata);
    }
  }
  
  reports.sort((a, b) => b.date.localeCompare(a.date));
  
  const manifest: Manifest = {
    generated_at_utc: new Date().toISOString(),
    version: 1,
    latest: reports.length > 0 ? {
      date: reports[0].date,
      paths: reports[0].paths,
    } : null,
    reports,
  };
  
  const manifestPath = join(publicDir, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  
  log('success', `Generated manifest with ${reports.length} reports`);
}
