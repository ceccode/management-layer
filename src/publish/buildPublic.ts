import { mkdir, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { log } from '../utils/logging.js';
import { buildManifest } from './manifest.js';

interface PublishData {
  weekDate: string;
  markdownContent: string;
  telegramContent: string;
  jsonContent: string;
}

export async function buildPublicDirectory(data: PublishData): Promise<void> {
  const publicDir = join(process.cwd(), 'public');
  
  const dirs = [
    publicDir,
    join(publicDir, 'reports'),
    join(publicDir, 'telegram'),
    join(publicDir, 'data'),
  ];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
  
  const basename = `${data.weekDate}.management-layer`;
  
  const reportPath = join(publicDir, 'reports', `${basename}.md`);
  await writeFile(reportPath, data.markdownContent, 'utf-8');
  log('success', `Written report: ${reportPath}`);
  
  const telegramPath = join(publicDir, 'telegram', `${basename}.telegram.md`);
  await writeFile(telegramPath, data.telegramContent, 'utf-8');
  log('success', `Written telegram: ${telegramPath}`);
  
  const jsonPath = join(publicDir, 'data', `${basename}.json`);
  await writeFile(jsonPath, data.jsonContent, 'utf-8');
  log('success', `Written JSON: ${jsonPath}`);
  
  await buildManifest(publicDir);
  
  await generateIndexHtml(publicDir);
  
  const archiveDir = join(process.cwd(), 'reports');
  if (!existsSync(archiveDir)) {
    await mkdir(archiveDir, { recursive: true });
  }
  const archivePath = join(archiveDir, `${basename}.md`);
  await copyFile(reportPath, archivePath);
  log('info', `Archived report to: ${archivePath}`);
}

async function generateIndexHtml(publicDir: string): Promise<void> {
  const manifestPath = join(publicDir, 'manifest.json');
  
  if (!existsSync(manifestPath)) {
    log('warn', 'No manifest found, skipping index.html generation');
    return;
  }
  
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);
  
  const latestReport = manifest.latest 
    ? `<p><strong>Latest Report:</strong> <a href="${manifest.latest.paths.markdown}">${manifest.latest.date}</a></p>`
    : '<p>No reports available yet.</p>';
  
  const reportsList = manifest.reports
    .slice(0, 10)
    .map((report: any) => `<li><a href="${report.paths.markdown}">${report.date}</a> - ${report.title}</li>`)
    .join('\n      ');
  
  const html = `<!DOCTYPE html>
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
  
  const indexPath = join(publicDir, 'index.html');
  await writeFile(indexPath, html, 'utf-8');
  log('success', 'Generated index.html');
}

import { readFile } from 'fs/promises';
