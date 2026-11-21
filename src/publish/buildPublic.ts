import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { reportPaths } from '../report/report.js';
import { log } from '../utils/logging.js';
import { buildManifest, type Manifest } from './manifest.js';

const RECENT_REPORTS = 10;

interface PublishData {
  weekDate: string;
  markdownContent: string;
  telegramContent: string;
  jsonContent: string;
}

async function writePublicFile(publicDir: string, relativePath: string, content: string): Promise<string> {
  const path = join(publicDir, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content, 'utf-8');
  log('success', `Written: ${path}`);
  return path;
}

export async function buildPublicDirectory(data: PublishData): Promise<void> {
  const publicDir = join(process.cwd(), 'public');
  const paths = reportPaths(data.weekDate);

  const reportPath = await writePublicFile(publicDir, paths.markdown, data.markdownContent);
  await writePublicFile(publicDir, paths.telegram, data.telegramContent);
  await writePublicFile(publicDir, paths.json, data.jsonContent);

  const manifest = await buildManifest(publicDir);
  await writePublicFile(publicDir, 'index.html', renderIndexHtml(manifest));

  const archiveDir = join(process.cwd(), 'reports');
  await mkdir(archiveDir, { recursive: true });
  const archivePath = join(archiveDir, `${data.weekDate}.management-layer.md`);
  await copyFile(reportPath, archivePath);
  log('info', `Archived report to: ${archivePath}`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderIndexHtml(manifest: Manifest): string {
  const latestReport = manifest.latest
    ? `<p><strong>Latest Report:</strong> <a href="${escapeHtml(manifest.latest.paths.markdown)}">${escapeHtml(manifest.latest.date)}</a></p>`
    : '<p>No reports available yet.</p>';

  const reportsList = manifest.reports
    .slice(0, RECENT_REPORTS)
    .map(report => `<li><a href="${escapeHtml(report.paths.markdown)}">${escapeHtml(report.date)}</a> - ${escapeHtml(report.title)}</li>`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Management Layer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      border-bottom: 2px solid #333;
      padding-bottom: 0.5rem;
    }
    .tagline {
      color: #666;
      font-style: italic;
      margin-top: -1rem;
      margin-bottom: 2rem;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .links {
      margin-top: 2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>The Management Layer</h1>
  <p class="tagline">How technology is actually led</p>
  
  ${latestReport}
  
  <div class="links">
    <p><strong>Resources:</strong></p>
    <ul>
      <li><a href="manifest.json">manifest.json</a> - Machine-readable index</li>
    </ul>
  </div>
  
  <h2>Recent Reports</h2>
  <ul>
    ${reportsList || '<li>No reports available yet.</li>'}
  </ul>
  
  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem;">
    <p>Contenuto informativo. Non costituisce consulenza professionale o manageriale.</p>
  </footer>
</body>
</html>`;
}
