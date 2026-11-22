import { formatDate } from './utils/date.js';

export interface CLIOptions {
  /** The date the report is published under, as YYYY-MM-DD. */
  date: string;
  /** The instant recency and the lookback window are measured from. */
  referenceTime: Date;
  noReddit: boolean;
  noHackerNews: boolean;
  noLlm: boolean;
  /** How many past reports feed the historical context; the config decides when omitted. */
  ragK?: number;
}

function parseReportDate(value: string): string {
  const isCalendarDate =
    /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

  if (!isCalendarDate) {
    throw new Error(`Invalid --date "${value}": expected YYYY-MM-DD`);
  }

  return value;
}

function parsePositiveInteger(flag: string, value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} "${value}": expected a positive integer`);
  }

  return parsed;
}

/**
 * A report for a past date is measured from the end of that day; a report
 * for today is measured from now.
 */
function referenceTimeFor(date: string, now: Date): Date {
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  return endOfDay < now ? endOfDay : now;
}

export function parseArgs(args: string[], now: Date): CLIOptions {
  let date = formatDate(now);
  let noReddit = false;
  let noHackerNews = false;
  let noLlm = false;
  let ragK: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--date' && i + 1 < args.length) {
      date = parseReportDate(args[++i]);
    } else if (arg === '--no-reddit') {
      noReddit = true;
    } else if (arg === '--no-hn') {
      noHackerNews = true;
    } else if (arg === '--no-llm') {
      noLlm = true;
    } else if (arg === '--rag-k' && i + 1 < args.length) {
      ragK = parsePositiveInteger('--rag-k', args[++i]);
    }
  }

  return { date, referenceTime: referenceTimeFor(date, now), noReddit, noHackerNews, noLlm, ragK };
}
