#!/usr/bin/env node
// Batch audit: runs the site's Crawler Check and Positioning Check over a list of domains.
//
//   node scripts/batch-audit.js --input domains.csv --output results
//   node scripts/batch-audit.js --input domains.csv --output results --resume
//
// The checks are NOT re-implemented here: they are imported from src/lib/*.ts, the same
// modules the site's API routes use. See scripts/README.md for every option.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCsv, toCsv } from './lib/csv.js';
import { makeBatchFetch } from './lib/http.js';
import { summarizeCrawler, summarizePositioning } from './lib/summarize.js';

// ---------- shared check modules (TypeScript, run directly by Node's type stripping) ----------
let runCrawlerCheck, runPositioningCheck;
try {
  ({ runCrawlerCheck } = await import('../src/lib/crawler-check.ts'));
  ({ runPositioningCheck } = await import('../src/lib/positioning-check.ts'));
} catch (err) {
  if (err?.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
    console.error('This Node version cannot load .ts files directly. Use Node 22.18+ (or 23.6+),');
    console.error('or run: node --experimental-strip-types scripts/batch-audit.js ...');
    process.exit(1);
  }
  throw err;
}

// ---------- options ----------
const { values: opt } = parseArgs({
  options: {
    input: { type: 'string' },
    output: { type: 'string', default: 'results' },
    resume: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    'retry-failed': { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '3' },
    timeout: { type: 'string', default: '60' },
    'include-answers': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (opt.help || !opt.input) {
  console.log(`Usage: node scripts/batch-audit.js --input domains.csv [--output results] [options]

  --input FILE         CSV with a "domain" column (optional "company_name")
  --output PREFIX      writes PREFIX.csv, PREFIX.json, PREFIX.jsonl, PREFIX.errors.log (default: results)
  --resume             continue a previous run, skipping domains already processed
  --retry-failed       with --resume, also re-run domains that ended in error
  --force              start over: previous output is moved to PREFIX.backup-<time>.*
  --concurrency N      domains processed at the same time (default 3)
  --timeout SECONDS    time limit per domain and attempt (default 60)
  --include-answers    add layer 4 (what AI answers say). Not implemented yet.`);
  process.exit(opt.input || opt.help ? 0 : 1);
}

const concurrency = Math.max(1, Number.parseInt(opt.concurrency, 10) || 3);
const timeoutMs = Math.max(15, Number.parseInt(opt.timeout, 10) || 60) * 1000;
const MAX_DOMAIN_ATTEMPTS = 3;

const out = resolve(opt.output);
const files = {
  jsonl: `${out}.jsonl`, // append-only log of finished domains: the source of truth for --resume
  json: `${out}.json`,
  csv: `${out}.csv`,
  errors: `${out}.errors.log`,
};
mkdirSync(dirname(out), { recursive: true });

// ---------- optional modules (layer 4 and later) ----------
const enrichers = [];
if (opt['include-answers']) {
  const { answersModule } = await import('./lib/answers.js');
  if (!answersModule.implemented) {
    console.error('--include-answers: the answers module is not implemented yet (scripts/lib/answers.js).');
    process.exit(1);
  }
  enrichers.push(answersModule);
}

const COLUMNS = [
  'domain', 'company_name',
  'crawler_status', 'crawler_detail',
  'current_description', 'historical_descriptions',
  'latest_crawl_date', 'crawl_matches_current', 'mismatch_severity',
  ...enrichers.map((e) => e.column),
  'error',
];

// ---------- input ----------
/** example.com, https://www.Example.com/pricing → example.com */
function normalizeDomain(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'https://' + s;
  let host;
  try { host = new URL(s).hostname; } catch { return null; }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

if (!existsSync(opt.input)) { console.error(`Input file not found: ${opt.input}`); process.exit(1); }
const inputRows = parseCsv(readFileSync(opt.input, 'utf8'));
if (inputRows.length && !('domain' in inputRows[0])) {
  console.error('The input CSV needs a "domain" column.'); process.exit(1);
}
const queue = [];
const seen = new Set();
const invalid = [];
for (const row of inputRows) {
  const domain = normalizeDomain(row.domain);
  if (!domain) { if (row.domain) invalid.push(row.domain); continue; }
  if (seen.has(domain)) continue;
  seen.add(domain);
  queue.push({ domain, company_name: row.company_name || '', input: row.domain });
}

// ---------- previous output / resume ----------
const records = new Map(); // domain → latest record
const hasPrevious = existsSync(files.jsonl);
if (hasPrevious && opt.force) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const f of Object.values(files)) if (existsSync(f)) renameSync(f, f.replace(/(\.[a-z]+(\.log)?)$/, `.backup-${stamp}$1`));
  console.log(`--force: previous output moved to ${out}.backup-${stamp}.*`);
} else if (hasPrevious && !opt.resume) {
  console.error(`${files.jsonl} already exists. Use --resume to continue that run, or --force to start over.`);
  process.exit(1);
} else if (hasPrevious) {
  for (const line of readFileSync(files.jsonl, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); records.set(r.domain, r); } catch { /* half-written last line: ignore */ }
  }
}

const todo = queue.filter((q) => {
  const prev = records.get(q.domain);
  if (!prev) return true;
  return opt['retry-failed'] && prev.status === 'error';
});

// ---------- writing ----------
function logError(entry) {
  appendFileSync(files.errors, JSON.stringify({ time: new Date().toISOString(), ...entry }) + '\n');
}

function writeAtomic(path, content) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

function rewriteOutputs() {
  // Keep input order; include earlier results for domains that are no longer in the input.
  const ordered = [
    ...queue.map((q) => records.get(q.domain)).filter(Boolean),
    ...[...records.values()].filter((r) => !seen.has(r.domain)),
  ];
  writeAtomic(files.json, JSON.stringify(ordered, null, 2) + '\n');
  writeAtomic(files.csv, toCsv(ordered.map((r) => ({ domain: r.domain, company_name: r.company_name, ...r.summary, error: r.error })), COLUMNS));
}

function saveRecord(record) {
  records.set(record.domain, record);
  appendFileSync(files.jsonl, JSON.stringify(record) + '\n'); // written the moment it's done
  rewriteOutputs();
}

// ---------- one domain ----------
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(`${label} timed out after ${ms / 1000}s`), { name: 'TimeoutError' })), ms).unref()),
  ]);

const isTimeoutLike = (s) => /timeout|timed out|aborted/i.test(String(s || ''));

async function runTool(name, fn) {
  try {
    return await fn();
  } catch (err) {
    return { status: 0, data: { error: `${err?.name || 'Error'}: ${err?.message || err}` }, threw: true };
  }
}

async function auditOnce(item, attempt) {
  const { domain } = item;
  // Each check gets its own time limit, so one running long never loses the other's result.
  // Their internal budget is shorter, leaving room for requests already in flight to finish.
  const crawlerFetch = makeBatchFetch({ onError: logError, domain, tool: 'crawler' });
  const positioningFetch = makeBatchFetch({ onError: logError, domain, tool: 'positioning' });

  const budgetMs = Math.max(10000, timeoutMs - 15000);
  const [crawler, positioning] = await Promise.all([
    runTool('crawler', () => withTimeout(runCrawlerCheck(`https://${domain}/`, { fetch: crawlerFetch, budgetMs }), timeoutMs, `crawler check for ${domain}`)),
    runTool('positioning', () => withTimeout(runPositioningCheck(domain, { fetch: positioningFetch, budgetMs }), timeoutMs, `positioning check for ${domain}`)),
  ]);

  const extra = {};
  for (const e of enrichers) {
    try {
      const signal = AbortSignal.timeout(timeoutMs);
      const fetch = makeBatchFetch({ onError: logError, domain, tool: e.name });
      extra[e.name] = { ok: true, result: await e.run({ domain, companyName: item.company_name, crawler, positioning, fetch, signal }) };
    } catch (err) {
      extra[e.name] = { ok: false, error: String(err?.message || err) };
      logError({ domain, tool: e.name, kind: 'module-failed', error: String(err?.message || err) });
    }
  }

  const errors = [];
  if (crawler.status !== 200) errors.push(`crawler: ${crawler.data?.error ?? 'failed'}`);
  if (positioning.status !== 200) errors.push(`positioning: ${positioning.data?.error ?? 'failed'}`);
  for (const e of enrichers) if (!extra[e.name].ok) errors.push(`${e.name}: ${extra[e.name].error}`);
  for (const [tool, r] of [['crawler', crawler], ['positioning', positioning]]) {
    if (r.status !== 200) logError({ domain, tool, kind: 'check-failed', status: r.status, error: r.data?.error, attempt });
  }

  const summary = {
    ...summarizeCrawler(crawler),
    ...summarizePositioning(positioning),
    ...Object.fromEntries(enrichers.map((e) => [e.column, extra[e.name].ok ? e.summarize(extra[e.name].result) : ''])),
  };
  const bothFailed = crawler.status !== 200 && positioning.status !== 200;
  return {
    status: bothFailed ? 'error' : errors.length ? 'partial' : 'ok',
    error: errors.join(' | '),
    summary,
    crawler: crawler.data,
    positioning: positioning.data,
    ...Object.fromEntries(enrichers.map((e) => [e.name, extra[e.name]])),
    retryable: errors.length > 0 && (crawler.threw || positioning.threw || errors.some(isTimeoutLike)),
  };
}

async function audit(item) {
  const started = Date.now();
  let result;
  for (let attempt = 1; attempt <= MAX_DOMAIN_ATTEMPTS; attempt++) {
    try {
      result = await auditOnce(item, attempt);
    } catch (err) {
      // Whole-domain timeout or unexpected crash: record it, maybe retry.
      logError({ domain: item.domain, kind: 'domain-failed', error: `${err?.name}: ${err?.message}`, attempt });
      result = {
        status: 'error', error: `${err?.name || 'Error'}: ${err?.message || err}`,
        summary: { ...summarizeCrawler(null), ...summarizePositioning(null), crawler_status: 'error', crawler_detail: '' },
        crawler: null, positioning: null, retryable: true,
      };
    }
    if (!result.retryable || attempt === MAX_DOMAIN_ATTEMPTS) { result.attempts = attempt; break; }
    const wait = 2000 * 2 ** (attempt - 1);
    logError({ domain: item.domain, kind: 'domain-retry', attempt, waitMs: wait, error: result.error });
    await new Promise((r) => setTimeout(r, wait));
  }
  delete result.retryable;
  return {
    domain: item.domain,
    company_name: item.company_name,
    input: item.input,
    processed_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    ...result,
  };
}

// ---------- run ----------
const total = todo.length;
let done = 0;
let failed = 0;
const runStart = Date.now();
const fmt = (ms) => (ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`);

console.log(`Domains in input: ${queue.length}${invalid.length ? ` (skipped ${invalid.length} invalid: ${invalid.slice(0, 5).join(', ')})` : ''}`);
console.log(`Already done: ${queue.length - total}. To process now: ${total}. Concurrency ${concurrency}, timeout ${timeoutMs / 1000}s per domain.`);
console.log(`Output: ${files.csv}, ${files.json}  ·  errors: ${files.errors}\n`);
if (!total) { if (records.size) rewriteOutputs(); console.log('Nothing to do.'); process.exit(0); }

let cursor = 0;
async function worker() {
  while (cursor < todo.length) {
    const item = todo[cursor++];
    const record = await audit(item);
    saveRecord(record);
    done++;
    if (record.status === 'error') failed++;
    const elapsed = Date.now() - runStart;
    const eta = (elapsed / done) * (total - done);
    const tag = record.status === 'ok' ? 'ok' : record.status === 'partial' ? 'partial' : 'ERROR';
    console.log(
      `[${done}/${total}] ${item.domain.padEnd(28)} ${tag.padEnd(7)} ${fmt(record.duration_ms).padStart(5)}` +
        `  | crawler=${record.summary.crawler_status} crawl_matches=${record.summary.crawl_matches_current}` +
        `  | remaining ${total - done}, failed ${failed}, ETA ${fmt(eta)}` +
        (record.error ? `\n      ↳ ${record.error.slice(0, 160)}` : '')
    );
  }
}

process.on('SIGINT', () => {
  console.log(`\nStopped. ${done}/${total} saved. Run again with --resume to continue.`);
  process.exit(130);
});

await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
console.log(`\nFinished ${done} domains in ${fmt(Date.now() - runStart)} (${failed} failed, average ${fmt((Date.now() - runStart) / done)} per domain at concurrency ${concurrency}).`);
console.log(`→ ${files.csv}\n→ ${files.json}${failed ? `\n→ errors: ${files.errors} (re-run failed ones with --resume --retry-failed)` : ''}`);
// Exit now: requests abandoned by a timed-out check may still be open and would keep Node alive.
process.exit(0);
