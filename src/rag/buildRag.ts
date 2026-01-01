import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { extractLLMSections } from './extractSections.js';
import { countWords, truncateWords } from '../utils/truncate.js';
import { log } from '../utils/logging.js';

interface ReportMeta {
  date: string;
  path: string;
}

async function findRecentReports(weeksBack: number): Promise<ReportMeta[]> {
  const reportsDir = join(process.cwd(), 'public', 'reports');
  
  if (!existsSync(reportsDir)) {
    return [];
  }
  
  const files = await readdir(reportsDir);
  const reportFiles = files.filter(f => f.endsWith('.management-layer.md'));
  
  const reports: ReportMeta[] = reportFiles.map(filename => {
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';
    return {
      date,
      path: join(reportsDir, filename),
    };
  });
  
  reports.sort((a, b) => b.date.localeCompare(a.date));
  
  return reports.slice(0, weeksBack);
}

export async function buildRAGContext(weeksBack: number, maxWords: number): Promise<string> {
  const reports = await findRecentReports(weeksBack);
  
  if (reports.length === 0) {
    log('info', 'No previous reports found for RAG context');
    return '';
  }
  
  log('info', `Found ${reports.length} recent reports for RAG context`);
  
  let contextParts: string[] = [];
  let totalWords = 0;
  
  for (const report of reports) {
    try {
      const content = await readFile(report.path, 'utf-8');
      const llmSections = extractLLMSections(content);
      
      if (!llmSections) {
        continue;
      }
      
      const sectionWords = countWords(llmSections);
      
      if (totalWords + sectionWords > maxWords) {
        break;
      }
      
      contextParts.push(`---\nSettimana: ${report.date}\n\n${llmSections}`);
      totalWords += sectionWords;
    } catch (error) {
      log('warn', `Failed to read report ${report.path}:`, error);
    }
  }
  
  let context = contextParts.join('\n\n');
  
  if (countWords(context) > maxWords) {
    context = truncateWords(context, maxWords);
  }
  
  const ragDir = join(process.cwd(), 'rag');
  if (!existsSync(ragDir)) {
    await mkdir(ragDir, { recursive: true });
  }
  
  const ragPath = join(ragDir, 'rag_context.txt');
  await writeFile(ragPath, context, 'utf-8');
  
  log('success', `Built RAG context: ${totalWords} words from ${contextParts.length} reports`);
  
  return context;
}
