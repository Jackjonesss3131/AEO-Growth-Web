export const prerender = false;

const BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
];

const UA = 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)';
const TIMEOUT = 15000;

async function get(url, ua = UA) {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': ua, accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const body = await r.text();
    return { ok: r.ok, status: r.status, headers: r.headers, body, url: r.url };
  } catch (e) {
    return { err: e.message };
  }
}

function parseRobots(txt) {
  const groups = [];
  let cur = null;
  for (let line of txt.split('\n')) {
    line = line.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();

    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (cur && (key === 'allow' || key === 'disallow')) {
      cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  return groups;
}

function botVerdict(groups, bot) {
  const name = bot.toLowerCase();
  let g = groups.find(x => x.agents.includes(name));
  let src = 'específico';
  if (!g) { g = groups.find(x => x.agents.includes('*')); src = 'comodín *'; }
  if (!g) return { state: 'OK', note: 'sin reglas' };

  const blockAll = g.rules.some(r => !r.allow && r.path === '/');
  if (blockAll) {
    const allowsSome = g.rules.some(r => r.allow && r.path && r.path !== '/');
    return {
      state: 'BLOQUEADO',
      note: allowsSome ? `todo salvo excepciones (${src})` : `Disallow: / (${src})`,
    };
  }
  const partial = g.rules.filter(r => !r.allow && r.path && r.path !== '/');
  if (partial.length) return { state: 'PARCIAL', note: `${partial.length} rutas bloqueadas (${src})` };
  return { state: 'OK', note: src };
}

async function checkRobots(base) {
  const r = await get(base + '/robots.txt');
  if (r.err) return { fail: true, note: r.err, bots: {} };
  if (r.status === 404) return { note: 'no existe (todo permitido)', bots: {} };
  if (!r.ok) return { fail: true, note: `HTTP ${r.status}`, bots: {} };
  if (/^\s*</.test(r.body)) return { fail: true, note: 'devuelve HTML, no robots.txt', bots: {} };

  const groups = parseRobots(r.body);
  const bots = {};
  for (const b of BOTS) bots[b] = botVerdict(groups, b);
  const sitemaps = [...r.body.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]);
  return { note: `${groups.length} grupos`, bots, sitemaps };
}

async function checkAccess(base) {
  const asBot = await get(base);
  const asHuman = await get(base, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120');

  if (asBot.err) return { fail: true, note: asBot.err };
  const out = { status: asBot.status, body: asBot.body, headers: asBot.headers };

  if (asBot.status === 403 || asBot.status === 401) {
    out.fail = true;
    out.note = `HTTP ${asBot.status} al bot` + (asHuman.ok ? ' pero 200 a un navegador → bloqueo por user-agent' : '');
  } else if (asBot.status === 429) {
    out.fail = true; out.note = 'HTTP 429 (rate limit)';
  } else if (!asBot.ok) {
    out.fail = true; out.note = `HTTP ${asBot.status}`;
  } else {
    out.note = `HTTP ${asBot.status}`;
  }
  return out;
}

function visibleWords(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? clean.split(' ').length : 0;
}

function checkJs(html) {
  const words = visibleWords(html);
  const kb = Math.round(html.length / 1024);
  if (words < 50) return { state: 'CRITICO', note: `${words} palabras en ${kb}KB — sin JS no hay contenido` };
  if (words < 200) return { state: 'AVISO', note: `${words} palabras en ${kb}KB — muy poco` };
  return { state: 'OK', note: `${words} palabras` };
}

function checkSchema(html) {
  const blocks = [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];
  if (!blocks.length) return { state: 'FALTA', note: 'sin JSON-LD' };

  const types = [];
  let broken = 0;
  for (const b of blocks) {
    try {
      const data = JSON.parse(b[1].trim());
      for (const n of [].concat(data['@graph'] || data)) {
        if (n && n['@type']) types.push(...[].concat(n['@type']));
      }
    } catch { broken++; }
  }
  if (broken) return { state: 'ROTO', note: `${broken} de ${blocks.length} no parsean` };
  const hasOrg = types.some(t => /Organization|Corporation|LocalBusiness/i.test(t));
  return {
    state: hasOrg ? 'OK' : 'AVISO',
    note: types.length ? types.join(', ') : 'vacío',
  };
}

function checkHeaders(headers, html) {
  const found = [];
  const xr = headers?.get?.('x-robots-tag');
  if (xr) found.push(`X-Robots-Tag: ${xr}`);

  const meta = [...html.matchAll(/<meta[^>]+name=["']([^"']*robots[^"']*)["'][^>]*content=["']([^"']+)["']/gi)];
  for (const m of meta) {
    if (/noindex|nofollow|noai|noimageai/i.test(m[2])) found.push(`${m[1]}: ${m[2]}`);
  }
  return found.length
    ? { state: 'AVISO', note: found.join(' | ') }
    : { state: 'OK', note: 'sin bloqueos' };
}

async function checkSitemap(base, fromRobots = []) {
  const urls = fromRobots.length ? fromRobots : [base + '/sitemap.xml', base + '/sitemap-index.xml'];
  for (const u of urls) {
    const r = await get(u);
    if (r.err || !r.ok) continue;
    const n = (r.body.match(/<loc>/g) || []).length;
    return { state: n ? 'OK' : 'AVISO', note: `${n} URLs — ${u.replace(base, '')}` };
  }
  return { state: 'FALTA', note: 'no encontrado' };
}

function normalize(u) {
  const url = new URL(u.startsWith('http') ? u : 'https://' + u);
  return url.origin;
}

async function analyzeSite(site) {
  const base = normalize(site);
  const robots = await checkRobots(base);
  const access = await checkAccess(base);

  const result = { base, robots: robots.bots, robotsNote: robots.note, access: access.note, flags: [] };

  if (robots.fail) result.flags.push('robots.txt');
  if (access.fail) result.flags.push('acceso');

  if (!access.fail && access.body) {
    const js = checkJs(access.body);
    const sc = checkSchema(access.body);
    const hd = checkHeaders(access.headers, access.body);
    const sm = await checkSitemap(base, robots.sitemaps);

    result.javascript = js;
    result.schema = sc;
    result.headers = hd;
    result.sitemap = sm;

    if (js.state === 'CRITICO') result.flags.push('js');
    if (sc.state === 'FALTA' || sc.state === 'ROTO') result.flags.push('schema');
    if (hd.state === 'AVISO') result.flags.push('cabeceras');
  }

  const blocked = BOTS.filter(b => robots.bots[b]?.state === 'BLOQUEADO');
  if (blocked.length) result.flags.push(`${blocked.length} bots bloqueados`);

  return result;
}

// GET /api/check-crawlers?url=https://ejemplo.com
export async function GET({ url }) {
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response(
      JSON.stringify({ error: 'Falta el parámetro ?url=' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await analyzeSite(target);
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
