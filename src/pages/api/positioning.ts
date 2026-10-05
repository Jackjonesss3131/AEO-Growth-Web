import type { APIRoute } from 'astro';

export const prerender = false;

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_TOOL = 'AEOGrowthPositioningCheck/1.0 (+https://www.aeogrowth.co/positioning-check)';

const json = (data: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(cache ? { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } : {}),
    },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function req(url: string, ua = UA_BROWSER, ms = 9000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(ms),
    });
    return { status: res.status, text: await res.text(), finalUrl: res.url };
  } catch {
    return { status: 0, text: '', finalUrl: '' };
  }
}

async function reqJson(url: string, ms = 9000): Promise<any | null> {
  const r = await req(url, UA_TOOL, ms);
  if (r.status !== 200) return null;
  try { return JSON.parse(r.text); } catch { return null; }
}

function isSafeHost(h: string) {
  return !(
    !h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.includes(':')
  );
}

const tsToDate = (ts: string) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const daysBetween = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) / 86400000;

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

function meta(html: string, attr: 'name' | 'property', key: string) {
  const c = `content=(?:"([^"]*)"|'([^']*)')`;
  const k = `${attr}=["']${key}["']`;
  const m =
    html.match(new RegExp(`<meta[^>]+${k}[^>]*${c}`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+${c}[^>]*${k}`, 'i'));
  const v = m ? decode(m[1] ?? m[2] ?? '') : '';
  return v || null;
}

function schemaDescription(html: string) {
  const found: { type: string; desc: string }[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) return n.forEach(walk);
        const types = ([] as string[]).concat(n['@type'] || []);
        if (typeof n.description === 'string' && types.length) found.push({ type: types[0], desc: n.description });
        Object.values(n).forEach(walk);
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore */ }
  }
  for (const p of ['Organization', 'Corporation', 'SoftwareApplication', 'Product', 'WebSite', 'WebPage']) {
    const f = found.find((x) => x.type === p);
    if (f) return decode(f.desc);
  }
  return found[0] ? decode(found[0].desc) : null;
}

function extract(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return {
    title: title ? decode(title[1]) || null : null,
    metaDescription: meta(html, 'name', 'description'),
    ogDescription: meta(html, 'property', 'og:description'),
    h1: h1 ? decode(h1[1]) || null : null,
    schemaDescription: schemaDescription(html),
  };
}

type Fields = ReturnType<typeof extract>;

const mainDescription = (f: Fields) =>
  f.metaDescription || f.ogDescription || f.schemaDescription ||
  [f.title, f.h1].filter(Boolean).join(' - ') || null;

const positioningText = (f: Fields) =>
  [f.title, mainDescription(f)].filter(Boolean).join(' - ') || null;

function llmsSummary(txt: string) {
  if (!txt || txt.trimStart().startsWith('<')) return null;
  const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const quote = lines.find((l) => l.startsWith('>'));
  if (quote) return quote.replace(/^>\s*/, '');
  return lines.find((l) => !l.startsWith('#')) || null;
}

const STOP = new Set(
  ('the and for with your you our are that this from into more than have has can will all its not but out who ' +
    'what how why when where which about over just also any each per via their them they then there these those ' +
    'been being was were www com get one way make help helps teams team best new now use using built').split(' ')
);

const keywords = (t: string) =>
  new Set((t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w)));

function compare(before: string | null, after: string | null) {
  if (!before || !after) return null;
  const A = keywords(before), B = keywords(after);
  const shared = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  const similarity = union ? shared / union : 1;
  return {
    similarity: Math.round(similarity * 100) / 100,
    level: similarity >= 0.5 ? 'stable' : similarity >= 0.2 ? 'shifted' : 'rewritten',
    dropped: [...A].filter((w) => !B.has(w)),
    added: [...B].filter((w) => !A.has(w)),
  };
}

function coverage(field: string, main: string) {
  const F = keywords(field), M = keywords(main);
  if (!F.size) return 1;
  return [...F].filter((w) => M.has(w)).length / F.size;
}

async function waybackSnapshot(hosts: string[], monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const stamp = ymd(d);
  const target = d.toISOString().slice(0, 10);

  for (const host of hosts) {
    const data = await reqJson(
      `https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=${stamp}`
    );
    const snap = data?.archived_snapshots?.closest;
    if (!snap?.available || !snap.timestamp) continue;
    if (daysBetween(tsToDate(snap.timestamp), target) > 240) continue;

    const raw = `https://web.archive.org/web/${snap.timestamp}id_/https://${host}/`;
    const page = await req(raw, UA_TOOL, 14000);
    if (page.status !== 200 || !page.text) continue;

    const fields = extract(page.text);
    const description = mainDescription(fields);
    if (!description) continue;

    return {
      date: tsToDate(snap.timestamp),
      archiveUrl: `https://web.archive.org/web/${snap.timestamp}/https://${host}/`,
      fields,
      description,
      positioning: positioningText(fields),
    };
  }
  return null;
}

async function commonCrawl(hosts: string[]) {
  const colls = await reqJson('https://index.commoncrawl.org/collinfo.json', 8000);
  if (!Array.isArray(colls) || !colls.length) return null;

  const picked = [colls[0], colls[3], colls[6], colls[9]].filter(Boolean);

  const captures: { crawl: string; date: string }[] = [];
  let errors = 0;
  let blocked = false;

  for (const c of picked) {
    if (blocked) break;
    let hit = false;

    for (const host of hosts) {
      const r = await req(
        `${c['cdx-api']}?url=${encodeURIComponent(host + '/')}&output=json&limit=1`,
        UA_TOOL,
        14000
      );

      if (r.status === 503 || r.status === 429) { blocked = true; break; }
      if (r.status === 404) continue;
      if (r.status !== 200) { errors++; continue; }

      try {
        const row = JSON.parse(r.text.split('\n')[0]);
        if (row?.timestamp) {
          captures.push({ crawl: c.id as string, date: tsToDate(row.timestamp) });
          hit = true;
        }
      } catch { errors++; }

      if (hit) break;
      await sleep(400);
    }

    await sleep(900);
  }

  return { crawlsChecked: picked.length, errors, blocked, captures };
}

async function wikidata(host: string) {
  const bare = host.replace(/^www\./, '');
  const sites = [`https://${bare}`, `https://www.${bare}`, `http://${bare}`, `http://www.${bare}`]
    .flatMap((u) => [`<${u}>`, `<${u}/>`])
    .join(' ');
  const q = `SELECT ?item ?itemLabel ?itemDescription WHERE {
    VALUES ?site { ${sites} }
    ?item wdt:P856 ?site .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 1`;

  const data = await reqJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`);
  if (!data) return { checked: false };
  const b = data.results?.bindings?.[0];
  if (!b) return { checked: true, found: false };
  return {
    checked: true,
    found: true,
    url: b.item.value,
    label: b.itemLabel?.value || null,
    description: b.itemDescription?.value || null,
  };
}

export const GET: APIRoute = async ({ url }) => {
  let typedHost: string;
  try {
    let input = (url.searchParams.get('domain') || '').trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    typedHost = new URL(input).hostname.toLowerCase();
  } catch {
    return json({ error: 'Enter a domain like yourcompany.com' }, 400);
  }
  if (!isSafeHost(typedHost)) return json({ error: 'Enter a public domain like yourcompany.com' }, 400);

  const home = await req(`https://${typedHost}/`);
  if (home.status === 0 || home.status >= 400) {
    return json({ error: `We couldn't open ${typedHost}. Check the domain and try again.` }, 422);
  }

  let liveHost = typedHost;
  try { liveHost = new URL(home.finalUrl).hostname.toLowerCase(); } catch { /* keep typed */ }

  const hosts = [...new Set([liveHost, typedHost])];
  const today = new Date().toISOString().slice(0, 10);

  const [llms, s36, s24, s12, cc, wd] = await Promise.all([
    req(`https://${liveHost}/llms.txt`),
    waybackSnapshot(hosts, 36),
    waybackSnapshot(hosts, 24),
    waybackSnapshot(hosts, 12),
    commonCrawl(hosts),
    wikidata(liveHost),
  ]);

  const fields = extract(home.text);
  const description = mainDescription(fields);
  const positioning = positioningText(fields);
  const llmsText = llms.status === 200 ? llmsSummary(llms.text) : null;

  const seen = new Set<string>();
  const snapshots = [s36, s24, s12]
    .filter((s): s is NonNullable<typeof s> => !!s)
    .filter((s) => daysBetween(s.date, today) > 90 && !seen.has(s.date) && seen.add(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const history = snapshots.map((s) => ({
    ...s,
    vsToday: compare(s.positioning, positioning),
    titleChanged: !!s.fields.title && !!fields.title && s.fields.title !== fields.title,
  }));
  const oldest = history[0];

  const versions = [...history.map((h) => h.date), today];
  const versionFor = (d: string) => versions.reduce((v, x) => (x <= d ? x : v), versions[0]);

  const captures = (cc?.captures || [])
    .map((c) => ({ ...c, version: versionFor(c.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const byVersion: Record<string, number> = {};
  for (const c of captures) byVersion[c.version] = (byVersion[c.version] || 0) + 1;

  const consistency = ([
    ['Title tag', fields.title],
    ['Meta description', fields.metaDescription],
    ['Open Graph description', fields.ogDescription],
    ['H1', fields.h1],
    ['Schema description', fields.schemaDescription],
    ['llms.txt summary', llmsText],
  ] as const).map(([field, value]) => ({
    field,
    value: value || null,
    matches: !value || !description ? null : value === description ? true : coverage(value, description) >= 0.3,
  }));

  const ccOlder = captures.filter((c) => c.version !== today).length;

  return json(
    {
      domain: liveHost,
      redirectedFrom: liveHost !== typedHost ? typedHost : null,
      analyzedAt: new Date().toISOString(),
      today: {
        date: today,
        fields,
        description,
        llms: llmsText,
        addedSinceOldest: oldest ? compare(oldest.positioning, positioning)?.added || [] : [],
      },
      history,
      commonCrawl: cc
        ? { crawlsChecked: cc.crawlsChecked, errors: cc.errors, blocked: cc.blocked, captures, byVersion }
        : null,
      wikidata: wd,
      consistency,
      summary: oldest
        ? {
            since: oldest.date,
            level: oldest.vsToday?.level || null,
            titleChanged: history.some((h) => h.titleChanged),
            oldTitle: oldest.fields.title || null,
            newTitle: fields.title || null,
            ccTotal: captures.length,
            ccOlder,
          }
        : null,
    },
    200,
    true
  );
};
