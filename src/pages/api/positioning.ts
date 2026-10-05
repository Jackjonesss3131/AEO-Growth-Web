import type { APIRoute } from 'astro';

export const prerender = false;

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_TOOL = 'AEOGrowthPositioningCheck/1.0 (+https://www.aeogrowth.co/positioning-check)';

const MONTHS_BACK = [36, 24, 12, 6];

// ---------- helpers ----------
const json = (data: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(cache ? { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } : {}),
    },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tsToDate = (ts: string) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const daysBetween = (a: string, b: string) => Math.abs(+new Date(a) - +new Date(b)) / 86400000;

async function req(url: string, ua = UA_BROWSER, ms = 10000) {
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

async function reqJson(url: string, ms = 10000) {
  const r = await req(url, UA_TOOL, ms);
  if (r.status !== 200) return null;
  try { return JSON.parse(r.text); } catch { return null; }
}

function isPublicHost(h: string) {
  return (
    h.includes('.') &&
    !h.includes(':') &&
    h !== 'localhost' &&
    !h.endsWith('.local') &&
    !h.endsWith('.internal') &&
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
  const preferred = ['Organization', 'Corporation', 'SoftwareApplication', 'Product', 'WebSite', 'WebPage'];
  for (const p of preferred) {
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

  // El título nombra la categoría, la descripción la explica. Las dos juntas
  // son lo que un modelo usa para decidir qué eres.
  const positioning = [fields.title, description].filter(Boolean).join(' - ') || null;

  return { fields, description, positioning };
}

function llmsSummary(text: string) {
  if (!text || text.trimStart().startsWith('<')) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const quoted = lines.find((l) => l.startsWith('>'));
  if (quoted) return quoted.replace(/^>\s*/, '');
  return lines.find((l) => !l.startsWith('#') && !l.startsWith('[')) || null;
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

function diff(before: string | null, after: string | null) {
  if (!before || !after) return null;
  const A = words(before);
  const B = words(after);
  const shared = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  const similarity = union ? shared / union : 1;
  return {
    level: similarity >= 0.55 ? 'stable' : similarity >= 0.25 ? 'shifted' : 'rewritten',
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

// ---------- sources ----------
async function archivedHomepage(hosts: string[], monthsAgo: number) {
  const when = new Date();
  when.setMonth(when.getMonth() - monthsAgo);

  for (const host of hosts) {
    const info = await reqJson(
      `https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=${ymd(when)}`
    );
    const snap = info?.archived_snapshots?.closest;
    if (!snap?.available || !snap.timestamp) continue;

    // id_ devuelve el HTML original, sin la barra del archivo
    const page = await req(`https://web.archive.org/web/${snap.timestamp}id_/https://${host}/`, UA_TOOL, 15000);
    if (page.status !== 200 || !page.text) continue;

    const read = readPage(page.text);
    if (!read.positioning) continue;

    return {
      date: tsToDate(snap.timestamp),
      archiveUrl: `https://web.archive.org/web/${snap.timestamp}/https://${host}/`,
      ...read,
    };
  }
  return null;
}

// El índice de Common Crawl está muy limitado: consultas en serie, pocas, con pausa.
async function commonCrawl(hosts: string[]) {
  const collections = await reqJson('https://index.commoncrawl.org/collinfo.json', 9000);
  if (!Array.isArray(collections) || !collections.length) return { ok: false, reason: 'down' as const };

  const picked = [collections[0], collections[3], collections[6], collections[9]].filter(Boolean);
  const captures: { date: string }[] = [];

  for (const col of picked) {
    let found = false;

    for (const host of hosts) {
      const r = await req(
        `${col['cdx-api']}?url=${encodeURIComponent(host + '/')}&output=json&limit=1`,
        UA_TOOL,
        15000
      );

      if (r.status === 429 || r.status === 503) return { ok: false, reason: 'rate-limited' as const };
      if (r.status !== 200) continue; // 404 = no está en este índice

      try {
        const row = JSON.parse(r.text.split('\n')[0]);
        if (row?.timestamp) {
          captures.push({ date: tsToDate(row.timestamp) });
          found = true;
        }
      } catch { /* respuesta rara, se ignora */ }

      if (found) break;
      await sleep(400);
    }

    await sleep(900);
  }

  return { ok: true as const, checked: picked.length, captures };
}

async function wikidataEntry(host: string) {
  const bare = host.replace(/^www\./, '');
  const urls = [`https://${bare}`, `https://www.${bare}`, `http://${bare}`, `http://www.${bare}`]
    .flatMap((u) => [`<${u}>`, `<${u}/>`])
    .join(' ');

  const query = `SELECT ?item ?itemLabel ?itemDescription WHERE {
    VALUES ?site { ${urls} }
    ?item wdt:P856 ?site .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT 1`;

  const data = await reqJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
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
  let typedHost: string;
  try {
    let input = (url.searchParams.get('domain') || '').trim();
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    typedHost = new URL(input).hostname.toLowerCase();
  } catch {
    return json({ error: 'Enter a domain like yourcompany.com' }, 400);
  }
  if (!isPublicHost(typedHost)) return json({ error: 'Enter a public domain like yourcompany.com' }, 400);

  // Abrimos la home primero: nos dice a qué dominio redirige de verdad
  const home = await req(`https://${typedHost}/`);
  if (home.status === 0 || home.status >= 400) {
    return json({ error: `We couldn't open ${typedHost}. Check the domain and try again.` }, 422);
  }

  let liveHost = typedHost;
  try { liveHost = new URL(home.finalUrl).hostname.toLowerCase(); } catch { /* keep typed */ }

  const hosts = [...new Set([liveHost, typedHost])];
  const today = new Date().toISOString().slice(0, 10);

  const [llms, cc, wikidata, ...archived] = await Promise.all([
    req(`https://${liveHost}/llms.txt`),
    commonCrawl(hosts),
    wikidataEntry(liveHost),
    ...MONTHS_BACK.map((m) => archivedHomepage(hosts, m)),
  ]);

  const live = readPage(home.text);
  const llmsText = llms.status === 200 ? llmsSummary(llms.text) : null;

  // Línea de tiempo: sin capturas recientes, sin fechas repetidas,
  // y si dos capturas dicen lo mismo nos quedamos con la más reciente.
  const timeline: NonNullable<Awaited<ReturnType<typeof archivedHomepage>>>[] = [];
  for (const snap of archived) {
    if (!snap) continue;
    if (daysBetween(snap.date, today) <= 60) continue;
    if (timeline.some((t) => t.date === snap.date)) continue;

    const last = timeline[timeline.length - 1];
    if (last && last.positioning === snap.positioning) {
      timeline[timeline.length - 1] = snap;
    } else {
      timeline.push(snap);
    }
  }
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const history = timeline.map((snap) => ({
    date: snap.date,
    archiveUrl: snap.archiveUrl,
    fields: snap.fields,
    description: snap.description,
    vsToday: diff(snap.positioning, live.positioning),
  }));

  const oldest = timeline[0];

  // A cada captura de Common Crawl le asignamos la versión que estaba viva en esa fecha
  const versionDates = [...timeline.map((t) => t.date), today];
  const versionAt = (date: string) =>
    versionDates.reduce((chosen, v) => (v <= date ? v : chosen), versionDates[0]);

  const captures = cc.ok
    ? cc.captures
        .map((c) => ({ date: c.date, version: versionAt(c.date) }))
        .sort((a, b) => b.date.localeCompare(a.date))
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
      !value || !live.description
        ? null
        : value === live.description
          ? true
          : overlap(value, live.description) >= 0.3,
  }));

  const titleChanged =
    !!oldest?.fields.title && !!live.fields.title && oldest.fields.title !== live.fields.title;

  return json(
    {
      domain: liveHost,
      redirectedFrom: liveHost === typedHost ? null : typedHost,
      analyzedAt: new Date().toISOString(),
      today: {
        date: today,
        fields: live.fields,
        description: live.description,
        llms: llmsText,
        added: oldest ? diff(oldest.positioning, live.positioning)?.added || [] : [],
      },
      history,
      commonCrawl: cc.ok
        ? { ok: true, checked: cc.checked, captures, byVersion }
        : { ok: false, reason: cc.reason },
      wikidata,
      consistency,
      summary: oldest
        ? {
            since: oldest.date,
            level: diff(oldest.positioning, live.positioning)?.level || null,
            titleChanged,
            oldTitle: oldest.fields.title,
            newTitle: live.fields.title,
            capturesTotal: captures.length,
            capturesOnOldVersion: captures.filter((c) => c.version !== today).length,
          }
        : null,
    },
    200,
    true
  );
};
