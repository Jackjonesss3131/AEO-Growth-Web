import type { APIRoute } from 'astro';

export const prerender = false;

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_TOOL = 'AEOGrowthPositioningCheck/1.0 (+https://www.aeogrowth.co/positioning-check)';

const TARGET_MONTHS = [36, 24, 12, 6];
const TIME_BUDGET_MS = 48000; // Vercel corta a los 60s; terminamos antes con lo que haya

// ---------- helpers ----------
function respond(data: unknown, status = 200, cacheable = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheable ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store',
    },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tsToDate = (ts: string) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const ymd = (d: Date) => isoDay(d).replace(/-/g, '');
const daysBetween = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) / 86400000;
const monthsAgo = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d; };

type Budget = { until: number };
const timeLeft = (b: Budget) => b.until - Date.now();

async function req(b: Budget, url: string, ua = UA_BROWSER, ms = 10000, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = Math.min(ms, timeLeft(b) - 500);
    if (timeout < 1000) break;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
      });
      if (res.status >= 500 && attempt < retries) { await sleep(800); continue; }
      return { status: res.status, text: await res.text(), finalUrl: res.url };
    } catch {
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

// Misma versión = mismo título y descripción casi igual (un número o un punto no cuentan).
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
// Una búsqueda por fecha objetivo, todas en paralelo. Reintenta si el archivo devuelve vacío.
async function archivedAt(b: Budget, hosts: string[], months: number) {
  const stamp = ymd(monthsAgo(months));
  let responded = false;

  for (const host of hosts) {
    let snap: any = null;
    for (let attempt = 0; attempt < 2 && !snap; attempt++) {
      const info = await reqJson(
        b,
        `https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=${stamp}`,
        8000
      );
      if (info) responded = true;
      snap = info?.archived_snapshots?.closest;
      if (!snap?.available || !snap.timestamp) { snap = null; if (attempt === 0) await sleep(600); }
    }
    if (!snap) continue;

    const page = await req(b, `https://web.archive.org/web/${snap.timestamp}id_/https://${host}/`, UA_TOOL, 12000, 1);
    if (page.status !== 200 || !page.text) continue;

    const read = readPage(page.text);
    if (!read.fields.title && !read.description) continue;

    return {
      responded: true,
      snap: {
        date: tsToDate(snap.timestamp),
        archiveUrl: `https://web.archive.org/web/${snap.timestamp}/https://${host}/`,
        ...read,
      },
    };
  }
  return { responded, snap: null };
}

// ---------- Common Crawl ----------
// CDX indexa por URL completa. Sin comodín, host/ no hace match aunque el sitio esté indexado.
async function commonCrawl(b: Budget, hosts: string[]) {
  const collections = await reqJson(b, 'https://index.commoncrawl.org/collinfo.json', 8000, 1);
  if (!Array.isArray(collections) || !collections.length) return { ok: false as const, reason: 'down' };

  const picked = [collections[0], collections[3], collections[6], collections[9]].filter(Boolean);
  const bare = hosts[0].replace(/^www\./, '');
  const patterns = [...new Set([...hosts, bare, 'www.' + bare])];
  const dates: string[] = [];
  let checked = 0;

  for (const col of picked) {
    if (timeLeft(b) < 6000) break;
    checked++;
    let hit = false;

    for (const host of patterns) {
      if (hit || timeLeft(b) < 4000) break;
      const target = encodeURIComponent(`${host}/*`);
      const r = await req(b, `${col['cdx-api']}?url=${target}&output=json&limit=5&filter=status:200`, UA_TOOL, 10000);
      if (r.status === 429 || r.status === 503) return { ok: false as const, reason: 'rate-limited' };
      if (r.status === 200 && r.text.trim()) {
        for (const line of r.text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const row = JSON.parse(line);
            if (row?.timestamp) { dates.push(tsToDate(row.timestamp)); hit = true; break; }
          } catch { /* respuesta rara */ }
        }
      }
      await sleep(300);
    }
    await sleep(700);
  }

  if (!checked) return { ok: false as const, reason: 'down' };
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
export const GET: APIRoute = async ({ url }) => {
  const budget: Budget = { until: Date.now() + TIME_BUDGET_MS };

  let typedHost: string;
  try {
    let input = (url.searchParams.get('domain') || '').trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    typedHost = new URL(input).hostname.toLowerCase();
  } catch {
    return respond({ error: 'Enter a domain like yourcompany.com' }, 400);
  }
  if (!isPublicHost(typedHost)) return respond({ error: 'Enter a public domain like yourcompany.com' }, 400);

  const home = await req(budget, `https://${typedHost}/`, UA_BROWSER, 10000, 1);
  if (home.status === 0 || home.status >= 400) {
    return respond({ error: `We couldn't open ${typedHost}. Check the domain and try again.` }, 422);
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

  // Versiones en orden. Capturas iguales se fusionan y nos quedamos con la fecha más vieja.
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

  // Si la última versión archivada es igual a la de hoy, es la actual: sabemos desde cuándo está viva.
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

  const boundaries = [
    ...versions.map((v) => ({ key: v.date, start: v.date })),
    { key: 'current', start: liveSince || today },
  ];
  const versionAt = (date: string) =>
    boundaries.reduce((chosen, b) => (b.start <= date ? b.key : chosen), boundaries[0].key);

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
        capturesOnOldVersion: captures.filter((c) => c.version !== 'current').length,
      }
    : null;

  // Solo se guarda en caché si salieron todas las fuentes principales
  const complete = archiveOk && snaps.length >= 2 && cc.ok;

  return respond(
    {
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
    },
    200,
    complete
  );
};
