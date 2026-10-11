// Positioning Check: shared logic.
// Used by the site's API route (src/pages/api/positioning.ts) and by the batch script
// (scripts/batch-audit.js). Change the logic here and both pick it up.
// Plain TypeScript with erasable types only, so Node can run it directly (type stripping).

// fetch used by the checks. A wrapper that queues requests (the batch script) sets
// `handlesTimeouts = true`; the checks then pass `timeoutMs` (time the request itself may take,
// counted from when it is actually sent) and `deadline` (epoch ms when the whole check must
// stop) instead of an AbortSignal, so time spent waiting in the queue isn't charged to the
// request. The site uses plain fetch and AbortSignals, as before.
export type FetchLike = ((input: string, init?: RequestInit & { timeoutMs?: number; deadline?: number }) => Promise<Response>) & {
  handlesTimeouts?: boolean;
};
export interface PositioningCheckOptions {
  /** fetch implementation (the batch script passes one with retries and logging). */
  fetch?: FetchLike;
  /** Whole-check time budget in ms. Default 40 s (Vercel kills the function at 60 s). */
  budgetMs?: number;
}
export interface PositioningCheckResult {
  /** HTTP-style status: 200 ok, 400 bad input, 422 site unreachable. */
  status: number;
  /** The report (status 200) or { error } otherwise. */
  data: any;
  /** True when archive and Common Crawl both answered, so the result is safe to cache. */
  complete: boolean;
}

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_TOOL = 'AEOGrowthPositioningCheck/1.0 (+https://www.aeogrowth.co/positioning-check)';

// The 3-month point covers recent crawls; without it most of them fell between snapshots.
const TARGET_MONTHS = [36, 24, 12, 6, 3];
// Vercel kills the function at maxDuration (60 s in astro.config.mjs) and returns a plain-text
// "A server error has occurred" page that the frontend can't parse. Keep a wide margin below it.
const DEFAULT_BUDGET_MS = 40000;
// Cap every download so one huge page or llms.txt can't exhaust the function's memory.
const MAX_BYTES = 4_000_000;

// ---------- helpers ----------
// Reads at most `max` bytes of the body, then cancels the rest of the download.
async function readCapped(res: Response, max = MAX_BYTES) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  if (size >= max) await reader.cancel().catch(() => {});
  const all = new Uint8Array(Math.min(size, max));
  let offset = 0;
  for (const c of chunks) {
    const part = c.subarray(0, Math.min(c.byteLength, all.length - offset));
    all.set(part, offset);
    offset += part.byteLength;
    if (offset >= all.length) break;
  }
  return new TextDecoder().decode(all);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tsToDate = (ts: string) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const ymd = (d: Date) => isoDay(d).replace(/-/g, '');
const daysBetween = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) / 86400000;
const monthsAgo = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };

// `notes` collects short diagnostic lines returned as `diagnostics` in the JSON (not shown on the page).
type Budget = { until: number; start: number; notes: string[]; fetch: FetchLike };
const note = (b: Budget, msg: string) => { b.notes.push(`${((Date.now() - b.start) / 1000).toFixed(1)}s ${msg}`); };
const timeLeft = (b: Budget) => b.until - Date.now();

async function req(b: Budget, url: string, ua = UA_BROWSER, ms = 10000, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = Math.min(ms, timeLeft(b) - 500);
    if (timeout < 1000) break;
    const managed = b.fetch.handlesTimeouts === true;
    const controller = new AbortController();
    const timer = managed ? undefined : setTimeout(() => controller.abort(), timeout);
    try {
      const res = await b.fetch(url, {
        headers: { 'User-Agent': ua, Accept: '*/*' },
        redirect: 'follow',
        ...(managed ? { timeoutMs: timeout, deadline: b.until - 500 } : { signal: controller.signal }),
      });
      const text = await readCapped(res);
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) { await sleep(800); continue; }
      return { status: res.status, text, finalUrl: res.url };
    } catch {
      clearTimeout(timer);
      if (attempt < retries) { await sleep(800); continue; }
    }
  }
  return { status: 0, text: '', finalUrl: '' };
}

async function reqJson(b: Budget, url: string, ms = 10000, retries = 0) {
  const r = await req(b, url, UA_TOOL, ms, retries);
  if (r.status !== 200) return null;
  try { return JSON.parse(r.text); } catch { return null; }
}

function isPublicHost(h: string) {
  return (
    h.includes('.') && !h.includes(':') && h !== 'localhost' &&
    !h.endsWith('.local') && !h.endsWith('.internal') &&
    !/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) &&
    !/^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

// ---------- reading a page ----------
const clean = (s: string) =>
  s.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

function metaTag(html: string, attr: 'name' | 'property', key: string) {
  const content = 'content=(?:"([^"]*)"|\'([^\']*)\')';
  const named = `${attr}=["']${key}["']`;
  const m =
    html.match(new RegExp(`<meta[^>]+${named}[^>]*${content}`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+${content}[^>]*${named}`, 'i'));
  return m ? clean(m[1] ?? m[2] ?? '') || null : null;
}

function schemaDescription(html: string) {
  const found: { type: string; desc: string }[] = [];
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) return n.forEach(walk);
        const types = ([] as string[]).concat(n['@type'] || []);
        if (typeof n.description === 'string' && types.length) found.push({ type: types[0], desc: n.description });
        Object.values(n).forEach(walk);
      };
      walk(JSON.parse(block[1]));
    } catch { /* invalid JSON-LD */ }
  }
  for (const p of ['Organization', 'Corporation', 'SoftwareApplication', 'Product', 'WebSite', 'WebPage']) {
    const hit = found.find((f) => f.type === p);
    if (hit) return clean(hit.desc);
  }
  return found[0] ? clean(found[0].desc) : null;
}

function readPage(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const fields = {
    title: title ? clean(title[1]) || null : null,
    metaDescription: metaTag(html, 'name', 'description'),
    ogDescription: metaTag(html, 'property', 'og:description'),
    h1: h1 ? clean(h1[1]) || null : null,
    schemaDescription: schemaDescription(html),
  };
  const description =
    fields.metaDescription || fields.ogDescription || fields.schemaDescription || fields.h1 || null;
  return { fields, description };
}

type Page = ReturnType<typeof readPage>;

function llmsSummary(text: string) {
  if (!text || text.trimStart().startsWith('<')) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const quoted = lines.find((l) => l.startsWith('>'));
  if (quoted) return quoted.replace(/^>\s*/, '');
  return lines.find((l) => !l.startsWith('#') && !l.startsWith('[')) || null;
}

function robotsBlocksCCBot(text: string) {
  if (!text || text.trimStart().startsWith('<')) return false;
  const groups: { agents: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) { current = { agents: [], disallow: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (key === 'disallow' && current) current.disallow.push(val);
    }
  }

  const group = groups.find((g) => g.agents.includes('ccbot')) ?? groups.find((g) => g.agents.includes('*'));
  return !!group && group.disallow.includes('/');
}

// ---------- comparing ----------
const STOP = new Set(
  ('the and for with your you our are that this from into more than have has can will all its not but out who ' +
   'what how why when where which about over just also any each per via their them they then there these those ' +
   'been being was were www com get one way make made help helps team teams best new now use used using build ' +
   'built start free more most every').split(' ')
);

const words = (t: string) =>
  new Set((t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w)));

const normalize = (t: string | null) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function similarity(a: string | null, b: string | null) {
  if (!a || !b) return 0;
  const A = words(a), B = words(b);
  const union = new Set([...A, ...B]).size;
  return union ? [...A].filter((w) => B.has(w)).length / union : 1;
}

function sameVersion(a: Page, b: Page) {
  return normalize(a.fields.title) === normalize(b.fields.title) && similarity(a.description, b.description) >= 0.8;
}

const positioningText = (p: Page) => [p.fields.title, p.description].filter(Boolean).join(' - ');

function diff(before: Page, after: Page) {
  const A = words(positioningText(before));
  const B = words(positioningText(after));
  const s = similarity(positioningText(before), positioningText(after));
  return {
    level: s >= 0.55 ? 'stable' : s >= 0.25 ? 'shifted' : 'rewritten',
    dropped: [...A].filter((w) => !B.has(w)),
    added: [...B].filter((w) => !A.has(w)),
  };
}

function overlap(field: string, main: string) {
  const F = words(field);
  if (!F.size) return 1;
  const M = words(main);
  return [...F].filter((w) => M.has(w)).length / F.size;
}

// ---------- Internet Archive ----------
// For each target date, ask the CDX index for the first capture on or after it (limit=1), and
// if there is none, the last capture before it (limit=-1), each within WINDOW_MONTHS.
// Narrow queries stay fast even for sites archived many times a day; a single query over the
// whole three years did not (it timed out for stripe.com). The availability API is only a
// fallback: it often answers {"archived_snapshots": {}} for heavily archived sites.
// Wayback treats www.example.com and example.com as the same URL, so hosts are deduplicated.
const WINDOW_MONTHS = 3;
const archiveHost = (h: string) => h.replace(/^www\./, '');

async function snapshotNear(b: Budget, host: string, target: Date) {
  const before = new Date(target); before.setMonth(before.getMonth() - WINDOW_MONTHS);
  const after = new Date(target); after.setMonth(after.getMonth() + WINDOW_MONTHS);
  if (after > new Date()) after.setTime(Date.now());
  const query = (from: Date, to: Date, limit: number) =>
    reqJson(
      b,
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&from=${ymd(from)}&to=${ymd(to)}` +
        `&filter=statuscode:200&filter=mimetype:text/html&fl=timestamp&limit=${limit}&output=json`,
      20000
    );
  const firstTs = (rows: any) => {
    const ts = Array.isArray(rows) && Array.isArray(rows[1]) ? String(rows[1][0]) : '';
    return /^\d{14}$/.test(ts) ? ts : null;
  };
  const rowsAfter = await query(target, after, 1);
  if (Array.isArray(rowsAfter)) {
    const ts = firstTs(rowsAfter) ?? firstTs(await query(before, target, -1));
    return { responded: true, ts };
  }
  const info = await reqJson(
    b,
    `https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=${ymd(target)}`,
    8000
  );
  const closest = info?.archived_snapshots?.closest;
  const ts = closest?.available ? String(closest.timestamp) : '';
  return { responded: !!info, ts: /^\d{14}$/.test(ts) ? ts : null };
}

async function archivedAt(b: Budget, hosts: string[], months: number) {
  const target = monthsAgo(months);
  let responded = false;

  for (const host of [...new Set(hosts.map(archiveHost))]) {
    const found = await snapshotNear(b, host, target);
    responded ||= found.responded;
    if (!found.ts) { note(b, `archive ${months}mo ${host}: no capture near ${ymd(target)}`); continue; }
    const ts = found.ts;

    const page = await req(b, `https://web.archive.org/web/${ts}id_/https://${host}/`, UA_TOOL, 12000, 1);
    if (page.status !== 200 || !page.text) { note(b, `archive ${months}mo ${host}: page ${ts} -> ${page.status || 'timeout/error'}`); continue; }

    const read = readPage(page.text);
    if (!read.fields.title && !read.description) { note(b, `archive ${months}mo ${host}: page ${ts} has no title/description`); continue; }
    note(b, `archive ${months}mo ${host}: ok ${ts}`);

    return {
      responded: true,
      snap: {
        date: tsToDate(ts),
        archiveUrl: `https://web.archive.org/web/${ts}/https://${host}/`,
        ...read,
      },
    };
  }
  return { responded, snap: null };
}

// ---------- Common Crawl ----------
// CDX indexa por URL completa. Sin comodín, host/ no hace match aunque el sitio esté indexado.
// The list of Common Crawl indexes changes once a month: fetch it once per hour, not per check.
let collinfoCache: { at: number; data: any[] } | null = null;
async function collinfo(b: Budget) {
  if (collinfoCache && Date.now() - collinfoCache.at < 3600_000) return collinfoCache.data;
  const data = await reqJson(b, 'https://index.commoncrawl.org/collinfo.json', 8000, 1);
  if (Array.isArray(data) && data.length) collinfoCache = { at: Date.now(), data };
  return data;
}

async function commonCrawl(b: Budget, hosts: string[]) {
  const collections = await collinfo(b);
  if (!Array.isArray(collections) || !collections.length) return { ok: false as const, reason: 'down' };

  const picked = [collections[0], collections[3], collections[6], collections[9]]
    .filter((c) => c && typeof c['cdx-api'] === 'string' && c['cdx-api'].startsWith('http'));
  if (!picked.length) return { ok: false as const, reason: 'down' };

  const bare = (hosts[0] || '').replace(/^www\./, '');
  const patterns = [...new Set([...hosts, bare, 'www.' + bare])].filter(Boolean);
  const dates: string[] = [];
  let checked = 0;
  let answered = 0; // indexes that actually returned a response (even an empty one)
  let rateLimited = false;

  // The sampled indexes are independent and each one is slow, so query them in parallel
  // (staggered slightly to stay polite). Sequentially they often ran out of time budget.
  await Promise.all(
    picked.map(async (col, i) => {
      await sleep(i * 250);
      if (timeLeft(b) < 6000) return;
      checked++;
      for (const host of patterns) {
        if (timeLeft(b) < 4000) return;
        const target = encodeURIComponent(`${host}/*`);
        // Index queries for large sites routinely take 8–20 s.
        const r = await req(b, `${col['cdx-api']}?url=${target}&output=json&limit=5&filter=status:200`, UA_TOOL, 18000);
        if (r.status === 429 || r.status === 503) { rateLimited = true; note(b, `cc ${col.id ?? i}: ${r.status}`); return; }
        if (r.status === 200 || r.status === 404) answered++;
        if (r.status === 200 && r.text.trim()) {
          for (const line of r.text.split('\n')) {
            if (!line.trim()) continue;
            try {
              const row = JSON.parse(line);
              if (row?.timestamp) { dates.push(tsToDate(row.timestamp)); note(b, `cc ${col.id ?? i}: hit ${host}`); return; }
            } catch { /* odd response line */ }
          }
        }
        note(b, `cc ${col.id ?? i}: ${host} -> ${r.status || 'timeout/error'}`);
        await sleep(300);
      }
    })
  );

  if (rateLimited && !dates.length) return { ok: false as const, reason: 'rate-limited' };
  // No index answered at all (timeouts, connection errors): that's "down", not "you're not in it".
  if (!checked || (!answered && !dates.length)) return { ok: false as const, reason: 'down' };
  return { ok: true as const, checked, dates };
}

// ---------- Wikidata ----------
async function wikidataEntry(b: Budget, host: string) {
  const bare = host.replace(/^www\./, '');
  const urls = [`https://${bare}`, `https://www.${bare}`, `http://${bare}`, `http://www.${bare}`]
    .flatMap((u) => [`<${u}>`, `<${u}/>`]).join(' ');
  const query = `SELECT ?item ?itemLabel ?itemDescription WHERE {
    VALUES ?site { ${urls} }
    ?item wdt:P856 ?site .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 1`;

  const data = await reqJson(b, `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, 8000);
  if (!data) return { checked: false };
  const row = data.results?.bindings?.[0];
  if (!row) return { checked: true, found: false };
  return {
    checked: true,
    found: true,
    url: row.item.value,
    label: row.itemLabel?.value || null,
    description: row.itemDescription?.value || null,
  };
}

// ---------- endpoint ----------
export async function runPositioningCheck(
  domain: string | null,
  opts: PositioningCheckOptions = {}
): Promise<PositioningCheckResult> {
  const budget: Budget = {
    until: Date.now() + (opts.budgetMs ?? DEFAULT_BUDGET_MS),
    start: Date.now(),
    notes: [],
    fetch: opts.fetch ?? ((u, i) => fetch(u, i)),
  };

  let typedHost: string;
  try {
    let input = (domain || '').trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    typedHost = new URL(input).hostname.toLowerCase();
  } catch {
    return { status: 400, data: { error: 'Enter a domain like yourcompany.com' }, complete: false };
  }
  if (!isPublicHost(typedHost)) return { status: 400, data: { error: 'Enter a public domain like yourcompany.com' }, complete: false };

  const home = await req(budget, `https://${typedHost}/`, UA_BROWSER, 10000, 1);
  if (home.status === 0 || home.status >= 400) {
    return { status: 422, data: { error: `We couldn't open ${typedHost}. Check the domain and try again.` }, complete: false };
  }

  let liveHost = typedHost;
  try { liveHost = new URL(home.finalUrl).hostname.toLowerCase(); } catch { /* keep typed */ }
  const hosts = [...new Set([liveHost, typedHost])];
  const today = isoDay(new Date());

  const [llms, robots, cc, wikidata, ...archived] = await Promise.all([
    req(budget, `https://${liveHost}/llms.txt`, UA_BROWSER, 8000),
    req(budget, `https://${liveHost}/robots.txt`, UA_BROWSER, 8000),
    commonCrawl(budget, hosts),
    wikidataEntry(budget, liveHost),
    ...TARGET_MONTHS.map((m) => archivedAt(budget, hosts, m)),
  ]);

  const live = readPage(home.text);
  const llmsText = llms.status === 200 ? llmsSummary(llms.text) : null;
  const ccbotBlocked = robots.status === 200 && robotsBlocksCCBot(robots.text);
  const archiveOk = archived.some((a) => a.responded);

  const seen = new Set<string>();
  const snaps = archived
    .map((a) => a.snap)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .filter((s) => daysBetween(s.date, today) > 60 && !seen.has(s.date) && !!seen.add(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const versions: typeof snaps = [];
  for (const s of snaps) {
    const last = versions[versions.length - 1];
    if (last && sameVersion(last, s)) continue;
    versions.push(s);
  }

  let liveSince: string | null = null;
  while (versions.length && sameVersion(versions[versions.length - 1], live)) {
    liveSince = versions.pop()!.date;
  }

  const history = versions.map((v) => ({
    date: v.date,
    archiveUrl: v.archiveUrl,
    fields: v.fields,
    description: v.description,
    vsToday: diff(v, live),
  }));

  const oldest = versions[0];

  // Which homepage version a crawl most likely captured. We only know the page at the dates of
  // the archive captures (and today). A crawl between two captures of the same version got that
  // version; a crawl between captures of different versions, or before the oldest capture, is
  // reported as 'unknown' instead of guessed.
  const versionOfSnap = (date: string) => {
    if (liveSince && date >= liveSince) return 'current';
    let key = 'unknown';
    for (const v of versions) if (v.date <= date) key = v.date;
    return key;
  };
  const timeline = [
    ...snaps.map((sn) => ({ date: sn.date, key: versionOfSnap(sn.date) })),
    { date: today, key: 'current' },
  ];
  const versionAt = (date: string) => {
    const prev = [...timeline].reverse().find((p) => p.date <= date);
    const next = timeline.find((p) => p.date >= date);
    if (!prev || !next) return 'unknown';
    return prev.key === next.key ? prev.key : 'unknown';
  };

  const captures = cc.ok
    ? cc.dates.map((d) => ({ date: d, version: versionAt(d) })).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const byVersion: Record<string, number> = {};
  for (const c of captures) byVersion[c.version] = (byVersion[c.version] || 0) + 1;

  const consistency = ([
    ['Title tag', live.fields.title],
    ['Meta description', live.fields.metaDescription],
    ['Open Graph description', live.fields.ogDescription],
    ['H1', live.fields.h1],
    ['Schema description', live.fields.schemaDescription],
    ['llms.txt summary', llmsText],
  ] as const).map(([field, value]) => ({
    field,
    value: value || null,
    matches:
      !value || !live.description ? null
        : value === live.description ? true
        : overlap(value, live.description) >= 0.3,
  }));

  const hasRecord = versions.length > 0 || liveSince !== null;
  const summary = hasRecord
    ? {
        since: oldest ? oldest.date : liveSince,
        level: oldest ? diff(oldest, live).level : 'stable',
        titleChanged: !!oldest && normalize(oldest.fields.title) !== normalize(live.fields.title),
        oldTitle: oldest ? oldest.fields.title : null,
        newTitle: live.fields.title,
        capturesTotal: captures.length,
        capturesOnOldVersion: captures.filter((c) => c.version !== 'current' && c.version !== 'unknown').length,
        capturesUnknown: captures.filter((c) => c.version === 'unknown').length,
      }
    : null;

  const complete = archiveOk && snaps.length >= 2 && cc.ok;

  return {
    status: 200,
    complete,
    data: {
      domain: liveHost,
      analyzedAt: new Date().toISOString(),
      archive: { ok: archiveOk },
      today: {
        fields: live.fields,
        description: live.description,
        llms: llmsText,
        liveSince,
        added: oldest ? diff(oldest, live).added : [],
      },
      history,
      commonCrawl: cc.ok
        ? { ok: true, checked: cc.checked, captures, byVersion, ccbotBlocked }
        : { ok: false, reason: cc.reason, ccbotBlocked },
      wikidata,
      consistency,
      summary,
      diagnostics: budget.notes,
    },
  };
}
