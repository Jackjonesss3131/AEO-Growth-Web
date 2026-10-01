// src/pages/api/check-crawlers.js
export const prerender = false;

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const TIMEOUT = 8000;
const MAX_CHARS = 3_000_000;
const XML = 'application/xml,text/xml,*/*;q=0.8';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const BOTS = [
  { name: 'GPTBot', company: 'OpenAI', type: 'entrenamiento', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)' },
  { name: 'OAI-SearchBot', company: 'OpenAI', type: 'busqueda', product: 'ChatGPT Search', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot' },
  { name: 'ChatGPT-User', company: 'OpenAI', type: 'usuario', product: 'ChatGPT cuando un usuario pide abrir tu página', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' },
  { name: 'ClaudeBot', company: 'Anthropic', type: 'entrenamiento', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' },
  { name: 'Claude-SearchBot', company: 'Anthropic', type: 'busqueda', product: 'la búsqueda de Claude' },
  { name: 'Claude-User', company: 'Anthropic', type: 'usuario', product: 'Claude cuando un usuario pide abrir tu página' },
  { name: 'PerplexityBot', company: 'Perplexity', type: 'busqueda', product: 'Perplexity', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' },
  { name: 'Perplexity-User', company: 'Perplexity', type: 'usuario', product: 'Perplexity cuando un usuario pide abrir tu página' },
  { name: 'Googlebot', company: 'Google', type: 'busqueda', product: 'Google, AI Overviews y AI Mode', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { name: 'Google-Extended', company: 'Google', type: 'entrenamiento', token: true, note: 'Gemini. No controla AI Overviews' },
  { name: 'Bingbot', company: 'Microsoft', type: 'busqueda', product: 'Bing y Copilot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/128.0.0.0 Safari/537.36' },
  { name: 'Applebot', company: 'Apple', type: 'busqueda', product: 'Siri y Spotlight' },
  { name: 'Applebot-Extended', company: 'Apple', type: 'entrenamiento', token: true, note: 'Apple Intelligence' },
  { name: 'Meta-ExternalAgent', company: 'Meta', type: 'entrenamiento' },
  { name: 'Amazonbot', company: 'Amazon', type: 'busqueda', product: 'Alexa' },
  { name: 'DuckAssistBot', company: 'DuckDuckGo', type: 'busqueda', product: 'DuckAssist' },
  { name: 'CCBot', company: 'Common Crawl', type: 'entrenamiento', note: 'Dataset abierto que usan muchos modelos' },
  { name: 'Bytespider', company: 'ByteDance', type: 'entrenamiento' },
];

const PRIVATE = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^::$/, /^f[cd]/i, /^fe80/i, /^::ffff:(127|10|192\.168|169\.254)\./i];

async function assertPublic(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || /\.(localhost|local|internal)$/.test(h)) throw new Error('Esa dirección no está permitida.');
  let addrs;
  if (isIP(h)) addrs = [h];
  else {
    try { addrs = (await lookup(h, { all: true })).map(a => a.address); }
    catch { throw new Error('No encontramos ese dominio. ¿Está bien escrito?'); }
  }
  if (addrs.some(a => PRIVATE.some(r => r.test(a)))) throw new Error('Esa dirección no está permitida.');
}

function normalize(input) {
  let s = String(input || '').trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw new Error('Esa URL no es válida.'); }
  u.hash = '';
  return u;
}

async function get(url, ua = BROWSER_UA, accept = 'text/html,application/xhtml+xml,*/*;q=0.8', timeout = TIMEOUT) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': ua, accept, 'accept-language': 'es,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
    });
    let body = await r.text();
    if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS);
    return { ok: r.ok, status: r.status, headers: r.headers, body, finalUrl: r.url || url, redirected: r.redirected, ms: Date.now() - t0 };
  } catch (e) {
    return { err: e.name === 'TimeoutError' ? 'tiempo agotado' : 'no responde', ms: Date.now() - t0 };
  }
}

const safeChar = n => (n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ');
function decode(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => safeChar(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeChar(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&(?!amp;)[a-z]+;/gi, ' ')
    .replace(/&amp;/g, '&');
}
function toText(html) {
  return decode(String(html)
    .replace(/<(script|style|noscript|svg|template|iframe|object)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}
const countWords = t => (t ? t.split(' ').filter(w => /[\p{L}\p{N}]/u.test(w)).length : 0);
function mainHtml(html) {
  const m = html.match(/<main[\s>][\s\S]*?<\/main>/i) || html.match(/<article[\s>][\s\S]*?<\/article>/i);
  if (m) return m[0];
  const body = (html.match(/<body[\s\S]*?<\/body>/i) || [html])[0];
  return body.replace(/<(nav|header|footer|aside)[\s>][\s\S]*?<\/\1>/gi, ' ');
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? '') : null;
}
function metas(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => ({
    name: (attr(m[0], 'name') || attr(m[0], 'property') || '').toLowerCase(),
    content: attr(m[0], 'content') || '',
  }));
}
const trimSlash = p => p.replace(/\/+$/, '') || '/';

function looksLikeChallenge(r) {
  if (!r || r.err) return false;
  if (r.headers.get('cf-mitigated')) return true;
  if (r.body.length > 60000) return false;
  return /cf-chl-|challenge-platform|<title>\s*Just a moment|Attention Required! \| Cloudflare|_Incapsula_Resource|datadome|px-captcha|Verifying you are human|Vercel Security Checkpoint/i
    .test(r.body.slice(0, 30000));
}

function parseRobots(txt) {
  const groups = [], sitemaps = [];
  let cur = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [], delay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') { sitemaps.push(val); continue; }
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: val });
    else if (key === 'crawl-delay') cur.delay = val;
  }
  return { groups, sitemaps };
}

function readRobots(r) {
  if (r.err) return { state: 'error', note: r.err, sitemaps: [] };
  if (r.status === 404 || r.status === 410) return { state: 'missing', status: r.status, sitemaps: [] };
  if (r.status >= 500) return { state: 'servererror', status: r.status, sitemaps: [] };
  if (r.status >= 400) return { state: 'missing', status: r.status, sitemaps: [] };
  if (/^\s*<(!doctype|html|head|body)/i.test(r.body)) return { state: 'html', status: r.status, sitemaps: [] };
  const parsed = parseRobots(r.body);
  return { state: 'ok', status: r.status, parsed, groups: parsed.groups.length, sitemaps: parsed.sitemaps };
}

function groupsFor(groups, bot) {
  const n = bot.toLowerCase();
  let m = groups.filter(g => g.agents.includes(n)), src = 'reglas propias';
  if (!m.length) { m = groups.filter(g => g.agents.includes('*')); src = 'reglas para *'; }
  if (!m.length) return null;
  return { rules: m.flatMap(g => g.rules), src, delay: m.map(g => g.delay).find(Boolean) || null };
}

function patternToRegex(p) {
  const anchored = p.endsWith('$');
  if (anchored) p = p.slice(0, -1);
  const re = p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + re + (anchored ? '$' : ''));
}

function isAllowed(rules, path) {
  let best = null;
  for (const r of rules) {
    if (r.path === '') continue;
    let hit;
    try { hit = patternToRegex(r.path).test(path); } catch { continue; }
    if (!hit) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) {
      best = { len, allow: r.allow, rule: `${r.allow ? 'Allow' : 'Disallow'}: ${r.path}` };
    }
  }
  return best ? { allowed: best.allow, rule: best.rule } : { allowed: true, rule: null };
}

function robotsVerdict(robots, bot, path) {
  if (robots.state === 'servererror') return { allowed: false, rule: `robots.txt responde ${robots.status}`, src: 'error' };
  if (robots.state !== 'ok') return { allowed: true, rule: null, src: 'sin robots.txt' };
  const g = groupsFor(robots.parsed.groups, bot);
  if (!g) return { allowed: true, rule: null, src: 'sin reglas' };
  return { ...isAllowed(g.rules, path), src: g.src, delay: g.delay };
}

function liveVerdict(r, browser, browserWords) {
  if (r.err) return { blocked: true, status: null, note: r.err };
  if ([401, 403, 406, 429, 451, 503].includes(r.status)) {
    return { blocked: true, status: r.status, note: r.status === 429 ? 'HTTP 429, límite de peticiones' : `HTTP ${r.status}` };
  }
  if (looksLikeChallenge(r)) return { blocked: true, status: r.status, note: 'página de verificación del firewall' };
  if (!r.ok) return { blocked: true, status: r.status, note: `HTTP ${r.status}` };
  const words = countWords(toText(mainHtml(r.body)));
  if (browser.ok && browserWords > 150 && words < browserWords * 0.3) {
    return { blocked: true, status: r.status, note: `recibe ${words} palabras; un navegador recibe ${browserWords}` };
  }
  return { blocked: false, status: r.status, note: `HTTP ${r.status}`, words };
}

const ORG_RE = /^(Organization|Corporation|LocalBusiness|OnlineBusiness|OnlineStore|Store|NGO|Consortium|ProfessionalService|LegalService|FinancialService|Restaurant|Dentist|Physician|RealEstateAgent|.+Organization|.+Business|.+Agency)$/;
const ARTICLE = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'Report', 'ScholarlyArticle'];
const EXPECT = {
  org: ['name', 'url', 'logo', 'sameAs'],
  article: ['headline', 'author', 'datePublished', 'dateModified', 'image'],
  Person: ['name', 'url', 'sameAs', 'jobTitle'],
  WebSite: ['name', 'url'],
  FAQPage: ['mainEntity'],
  Product: ['name', 'image', 'offers'],
  SoftwareApplication: ['name', 'offers', 'applicationCategory', 'operatingSystem'],
  BreadcrumbList: ['itemListElement'],
  HowTo: ['name', 'step'],
};

function parseSchema(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  let broken = 0;
  const walk = (n, top) => {
    if (Array.isArray(n)) { n.forEach(x => walk(x, top)); return; }
    if (!n || typeof n !== 'object') return;
    if (n['@type']) nodes.push({ n, top });
    for (const [k, v] of Object.entries(n)) {
      if (k === '@context' || !v || typeof v !== 'object') continue;
      walk(v, k === '@graph' ? top : false);
    }
  };
  for (const b of blocks) {
    try { walk(JSON.parse(b[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '')), true); }
    catch { broken++; }
  }
  const microdata = /itemtype\s*=\s*["']https?:\/\/schema\.org\//i.test(html);
  return { blocks: blocks.length, broken, nodes, microdata };
}

function summarizeSchema(s) {
  const types = new Set(), entities = [], dates = [];
  const empty = v => v == null || v === '' || (Array.isArray(v) && !v.length);
  for (const { n, top } of s.nodes) {
    for (const k of ['dateModified', 'datePublished', 'uploadDate']) if (typeof n[k] === 'string') dates.push(n[k]);
    for (const t of [].concat(n['@type'])) {
      if (typeof t !== 'string') continue;
      types.add(t);
      if (!top) continue;
      const kind = ORG_RE.test(t) ? 'org' : ARTICLE.includes(t) ? 'article' : EXPECT[t] ? t : null;
      if (!kind) continue;
      const name = typeof n.name === 'string' ? n.name : typeof n.headline === 'string' ? n.headline : '';
      const e = { type: t, kind, name: name.slice(0, 80), missing: EXPECT[kind].filter(p => empty(n[p])) };
      if (kind === 'org' || t === 'Person') e.sameAs = [].concat(n.sameAs || []).filter(x => typeof x === 'string');
      if (t === 'FAQPage') e.questions = [].concat(n.mainEntity || []).length;
      entities.push(e);
    }
  }
  const list = [...types];
  return { blocks: s.blocks, broken: s.broken, microdata: s.microdata, types: list, entities, hasOrg: list.some(t => ORG_RE.test(t)), dates };
}

const BOT_META = /^(robots|googlebot|bingbot|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-searchbot|anthropic-ai|perplexitybot|google-extended|ccbot)$/;

function analyzePage(r, base, host) {
  const html = r.body;
  const m = metas(html);
  const meta = n => m.find(x => x.name === n)?.content || null;
  const title = toText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  const canonTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(x => x[0]).find(t => /rel\s*=\s*["']?canonical/i.test(t));
  const mainText = toText(mainHtml(html));
  const headings = [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(x => ({ level: +x[1], text: toText(x[2]).slice(0, 140) }))
    .filter(h => h.text);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(x => x[0]);
  const internal = new Set();
  for (const x of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(x[1], base);
      if (u.hostname.replace(/^www\./, '') === host) internal.add(trimSlash(u.pathname));
    } catch {}
  }
  const schema = summarizeSchema(parseSchema(html));
  const metaDates = ['article:modified_time', 'article:published_time', 'og:updated_time'].map(meta).filter(Boolean);

  return {
    title,
    description: meta('description'),
    lang: attr((html.match(/<html\b[^>]*>/i) || [''])[0], 'lang'),
    canonical: canonTag ? attr(canonTag, 'href') : null,
    robotsMeta: m.filter(x => BOT_META.test(x.name)),
    xRobots: r.headers.get('x-robots-tag'),
    words: countWords(toText(html.replace(/<head[\s\S]*?<\/head>/i, ' '))),
    mainWords: countWords(mainText),
    preview: mainText.slice(0, 420),
    headings,
    h1: headings.filter(h => h.level === 1).map(h => h.text),
    questions: headings.filter(h => /\?\s*$/.test(h.text)).length,
    imgs: imgs.length,
    noAlt: imgs.filter(t => !/\salt\s*=/i.test(t)).length,
    internalLinks: internal.size,
    spaShell: /<div[^>]+id=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(html),
    htmlKB: Math.round(html.length / 1024),
    ms: r.ms,
    finalUrl: r.finalUrl,
    schema,
    dates: [...schema.dates, ...metaDates],
  };
}

const locs = x => [...x.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/gi)].map(m => m[1].trim());
const lastmods = x => [...x.matchAll(/<lastmod>\s*([^<\s]+)/gi)].map(m => m[1]);

async function readSitemap(base, fromRobots, safe) {
  const tried = [...new Set([...fromRobots, `${base}/sitemap-index.xml`, `${base}/sitemap.xml`, `${base}/sitemap_index.xml`])].slice(0, 4);
  for (const u of tried) {
    let h;
    try { h = new URL(u).hostname; } catch { continue; }
    if (!(await safe(h))) continue;
    const r = await get(u, BROWSER_UA, XML, 6000);
    if (r.err || !r.ok || !/<(urlset|sitemapindex)\b/i.test(r.body)) continue;

    let urls = [], mods = [], children = 0;
    if (/<sitemapindex\b/i.test(r.body)) {
      const kids = locs(r.body);
      children = kids.length;
      const allowed = [];
      for (const k of kids.slice(0, 5)) {
        try { if (await safe(new URL(k).hostname)) allowed.push(k); } catch {}
      }
      const res = await Promise.all(allowed.map(k => get(k, BROWSER_UA, XML, 6000)));
      for (const c of res) if (c.ok) { urls.push(...locs(c.body)); mods.push(...lastmods(c.body)); }
    } else {
      urls = locs(r.body);
      mods = lastmods(r.body);
    }
    const now = Date.now() + 864e5;
    const newestT = mods.map(Date.parse).filter(t => !isNaN(t) && t < now).reduce((a, b) => Math.max(a, b), 0);
    return {
      found: true, url: u, inRobots: fromRobots.includes(u), children,
      count: urls.length, withLastmod: mods.length,
      newest: newestT ? new Date(newestT).toISOString() : null,
      sameDate: mods.length > 5 && new Set(mods.map(d => d.slice(0, 10))).size === 1,
      urls, mods,
    };
  }
  return { found: false, count: 0, withLastmod: 0, urls: [], mods: [] };
}

function pickSpread(arr, n) {
  if (arr.length <= n) return arr;
  return [...new Set(Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))]))];
}

function readLlms(r) {
  if (!r || r.err || !r.ok) return { found: false };
  if (/^\s*<(!doctype|html|head|body)/i.test(r.body)) return { found: false, html: true };
  const lines = r.body.split('\n');
  return {
    found: true,
    title: (lines.find(l => /^#\s/.test(l)) || '').replace(/^#\s*/, '').slice(0, 100),
    sections: lines.filter(l => /^##\s/.test(l)).length,
    links: (r.body.match(/\]\(https?:\/\/[^)]+\)/g) || []).length,
  };
}

function buildFindings(c) {
  const { robots, bots, page, viewAs, browser, sitemap, samples, llms, freshness, base, host, liveCount } = c;
  const F = [], good = [];
  const add = (level, area, title, detail, fix = '') => F.push({ level, area, title, detail, fix });
  const list = a => a.join(', ');

  if (robots.state === 'servererror') add('alto', 'robots.txt', `robots.txt responde con error ${robots.status}`,
    'Cuando robots.txt da un error de servidor (5xx), Google deja de rastrear el sitio y otros crawlers lo tratan como "no entrar" hasta que se arregle.',
    'Haz que /robots.txt devuelva 200 con tus reglas, o 404 si no quieres reglas.');
  else if (robots.state === 'html') add('medio', 'robots.txt', '/robots.txt devuelve una página HTML',
    'Tu servidor responde en esa ruta con una página web. Los crawlers no encuentran reglas ni la dirección de tu sitemap.',
    'Crea un archivo de texto en public/robots.txt.');
  else if (robots.state === 'missing') add('bajo', 'robots.txt', 'No tienes robots.txt',
    'Sin robots.txt todo está permitido, lo cual no es malo, pero pierdes el sitio estándar donde declarar tu sitemap.',
    'Crea public/robots.txt con "User-agent: *", "Allow: /" y una línea "Sitemap:" con la URL de tu sitemap.');
  else if (robots.state === 'error') add('bajo', 'robots.txt', 'No pudimos leer robots.txt',
    `La petición falló (${robots.note}). Si nos pasa a nosotros, le puede pasar a un crawler.`);

  const searchBlocked = bots.filter(b => b.type !== 'entrenamiento' && !b.robots.allowed);
  const trainBlocked = bots.filter(b => b.type === 'entrenamiento' && !b.robots.allowed);
  if (searchBlocked.length) {
    const products = [...new Set(searchBlocked.map(b => b.product).filter(Boolean))];
    add('alto', 'Acceso', `robots.txt bloquea a bots que te pueden citar: ${list(searchBlocked.map(b => b.name))}`,
      `Estos bots alimentan ${list(products)}. Si no pueden leer la página, no puedes salir como fuente en sus respuestas. Regla: ${searchBlocked[0].robots.rule || '—'}.`,
      'Quita o ajusta esas líneas Disallow.');
  }
  if (trainBlocked.length && !searchBlocked.length) {
    good.push(`Bloqueas el entrenamiento (${list(trainBlocked.map(b => b.name))}) pero dejas pasar a los bots de búsqueda.`);
  }
  if (!trainBlocked.length && !searchBlocked.length && robots.state === 'ok') {
    good.push('robots.txt no bloquea a ningún crawler de IA en esta página.');
  }
  if (trainBlocked.some(b => b.name === 'Google-Extended')) add('info', 'Acceso', 'Bloquear Google-Extended no te saca de AI Overviews',
    'Google-Extended solo decide si Google puede usar tu contenido para Gemini. Las AI Overviews salen del índice normal de Googlebot.');
  if (bots.some(b => b.robots.delay)) add('info', 'robots.txt', 'Usas Crawl-delay',
    'Googlebot lo ignora. Un valor alto hace que los bots de búsqueda lean menos páginas tuyas.');

  const fw = bots.filter(b => b.live?.blocked && b.robots.allowed);
  if (fw.length && browser.ok) {
    add('alto', 'Acceso', `Tu servidor o firewall bloquea a ${list(fw.map(b => b.name))}`,
      `robots.txt los deja pasar, pero al pedir la página como ellos recibimos: ${list([...new Set(fw.map(b => b.live.note))])}. Un navegador normal sí recibe la página.`,
      'Revisa las reglas de bots de tu CDN o firewall.');
  } else if (browser.ok && liveCount && !bots.some(b => b.live?.blocked)) {
    good.push(`El servidor les entrega la misma página a ${liveCount} crawlers que a un navegador.`);
  }

  if (!page) {
    add('alto', 'Página', `La página no carga (${browser.err || 'HTTP ' + browser.status})`,
      'No conseguimos el contenido ni como navegador ni como crawler.');
    return { F, good };
  }

  const directives = [
    ...page.robotsMeta.map(m => ({ who: m.name, v: m.content })),
    ...(page.xRobots ? [{ who: 'X-Robots-Tag', v: page.xRobots }] : []),
  ];
  const noindex = directives.filter(d => /\b(noindex|none)\b/i.test(d.v));
  if (noindex.length) add('alto', 'Indexación', 'La página pide no ser indexada',
    `Encontramos: ${list(noindex.map(d => `${d.who}: ${d.v}`))}.`,
    'Quita el noindex si quieres que esta página aparezca.');
  if (directives.some(d => /\b(noai|noimageai)\b/i.test(d.v))) add('info', 'Indexación', 'Usas la etiqueta noai',
    'No es un estándar y los principales crawlers de IA no la respetan.');

  if (page.mainWords < 50) add('alto', 'Contenido', `Sin JavaScript la página está casi vacía (${page.mainWords} palabras)`,
    `Eso es lo que recibe ${viewAs}. Los crawlers de OpenAI, Anthropic y Perplexity no ejecutan JavaScript.${page.spaShell ? ' Hay un contenedor vacío típico de una app React/Vue.' : ''}`,
    'Renderiza el contenido en el servidor.');
  else if (page.mainWords < 150) add('medio', 'Contenido', `Muy poco texto en el HTML (${page.mainWords} palabras)`,
    'Con tan poco texto hay poco que citar.',
    'Añade texto real: qué haces, para quién, cómo trabajas, precios, preguntas frecuentes.');
  else if (page.mainWords >= 300) good.push(`El contenido está en el HTML: ${page.mainWords} palabras legibles sin JavaScript.`);

  if (!page.title) add('alto', 'Metadatos', 'La página no tiene <title>', 'Es lo primero que un sistema usa para saber de qué va la página.', 'Añade un título con el tema y tu marca.');
  else if (page.title.length > 70) add('bajo', 'Metadatos', `El título es largo (${page.title.length} caracteres)`, 'Se corta en los resultados.', 'Apunta a 50–65 caracteres.');
  if (!page.description) add('medio', 'Metadatos', 'Sin meta descripción', 'Es el resumen que buscadores y herramientas suelen leer antes que el resto.', 'Escribe 1–2 frases que digan qué ofreces y a quién.');
  if (page.title && page.description && page.title.length <= 70) good.push('Título y descripción presentes y con buena longitud.');
  if (!page.lang) add('bajo', 'Metadatos', 'Falta el atributo lang', 'Indica el idioma del contenido.', 'Ejemplo: <html lang="es">.');

  if (page.canonical) {
    let cu = null;
    try { cu = new URL(page.canonical, base); } catch {}
    if (cu && cu.hostname.replace(/^www\./, '') !== host) add('alto', 'Indexación', 'El canonical apunta a otro dominio',
      `Dice que la versión principal está en ${cu.hostname}. Los buscadores le darán el crédito a esa URL.`,
      'Haz que el canonical apunte a esta misma página.');
    else if (cu && trimSlash(cu.pathname) !== trimSlash(new URL(page.finalUrl).pathname)) add('medio', 'Indexación', 'El canonical apunta a otra URL',
      `Esta página dice que su versión principal es ${cu.pathname}.`,
      'Revisa la etiqueta <link rel="canonical">.');
  } else add('bajo', 'Indexación', 'Sin etiqueta canonical',
    'Evita que los buscadores dupliquen la página por variantes de URL.',
    'Añade <link rel="canonical"> en el <head>.');

  if (!page.h1.length) add('medio', 'Estructura', 'La página no tiene H1', 'El H1 es la señal más clara de cuál es el tema principal.', 'Pon un único H1 que diga qué es la página.');
  else if (page.h1.length > 1) add('bajo', 'Estructura', `Hay ${page.h1.length} H1`,
    `Encontramos: ${list(page.h1.slice(0, 3).map(h => `"${h}"`))}. Con varios H1 la jerarquía queda menos clara.`, 'Deja uno y pasa el resto a H2.');
  const hasFaq = page.schema.types.includes('FAQPage');
  if (page.questions === 0 && !hasFaq && page.mainWords >= 150) add('bajo', 'Contenido', 'Ningún encabezado está escrito como pregunta',
    'La gente le hace preguntas a la IA, y las respuestas suelen citar el pasaje que responde directamente.',
    'Convierte algunos H2 o H3 en las preguntas reales de tus clientes.');
  else if (page.questions >= 2) good.push(`${page.questions} encabezados escritos como pregunta: fáciles de citar.`);
  if (page.internalLinks < 5) add('medio', 'Estructura', `Solo ${page.internalLinks} enlaces internos`,
    'Los crawlers descubren el resto del sitio siguiendo enlaces.',
    'Enlaza tus páginas importantes desde el menú, el pie o el propio texto.');
  if (page.imgs >= 4 && page.noAlt / page.imgs > 0.3) add('bajo', 'Contenido', `${page.noAlt} de ${page.imgs} imágenes sin atributo alt`,
    'Los crawlers no ven las imágenes: el alt es lo único que saben de ellas.', 'Describe brevemente cada imagen relevante.');

  if (page.ms > 3000) add('medio', 'Rendimiento', `La página tardó ${(page.ms / 1000).toFixed(1)} s en responder`,
    'Los bots que leen páginas en el momento tienen poco margen.', 'Revisa caché, CDN y tiempo de servidor.');
  if (page.htmlKB > 1500) add('medio', 'Rendimiento', `HTML muy pesado (${page.htmlKB} KB)`,
    'Cuanto más pesado, más fácil que un crawler con límite de tiempo o tamaño se quede a medias.',
    'Saca CSS, JS y datos embebidos que no hagan falta.');
  try {
    const fh = new URL(page.finalUrl).hostname.replace(/^www\./, '');
    if (fh !== host) add('info', 'Acceso', `La URL redirige a ${fh}`, 'Analizamos la página final.');
  } catch {}

  const sc = page.schema;
  if (sc.broken) add('alto', 'Datos estructurados', `${sc.broken} bloque(s) JSON-LD con errores de sintaxis`,
    'Un JSON mal formado se descarta entero.', 'Valídalo en validator.schema.org.');
  if (!sc.blocks && !sc.microdata) add('medio', 'Datos estructurados', 'No hay datos estructurados',
    'Sin schema, las máquinas tienen que adivinar qué es tu negocio.',
    'Empieza por Organization y WebSite en el layout.');
  else {
    if (!sc.hasOrg) add('medio', 'Datos estructurados', 'Ningún bloque dice qué empresa está detrás',
      `Tienes ${list(sc.types.slice(0, 6))}, pero no Organization ni un tipo de negocio.`,
      'Añade un bloque Organization con name, url, logo y sameAs.');
    for (const e of sc.entities) {
      if (e.sameAs && !e.sameAs.length) add('medio', 'Datos estructurados', `${e.type}${e.name ? ` "${e.name}"` : ''} no tiene sameAs`,
        'sameAs enlaza la entidad con LinkedIn, Instagram, Crunchbase… Es la forma más directa de que una IA sepa que esa marca eres tú.',
        'Añade "sameAs": ["https://www.linkedin.com/company/…"].');
      else if (e.sameAs && e.sameAs.length >= 2) good.push(`${e.type} enlazado a ${e.sameAs.length} perfiles con sameAs.`);
      const rest = e.missing.filter(p => p !== 'sameAs');
      if (rest.length) add('bajo', 'Datos estructurados', `A ${e.type}${e.name ? ` "${e.name}"` : ''} le falta: ${list(rest)}`, 'Son las propiedades que se usan para entender este tipo de entidad.');
      if (e.type === 'FAQPage') add('info', 'Datos estructurados', `FAQPage con ${e.questions} preguntas`,
        'Desde 2023 Google solo muestra resultados enriquecidos de FAQ para webs de gobierno y salud. Aun así es contenido bien marcado.');
    }
  }

  if (!sitemap.found) add('medio', 'Sitemap', 'No encontramos sitemap',
    'Sin sitemap, los crawlers solo encuentran las páginas que estén enlazadas.',
    'Usa @astrojs/sitemap y declara la URL en robots.txt.');
  else {
    if (!sitemap.inRobots && robots.state === 'ok') add('bajo', 'Sitemap', 'El sitemap no está declarado en robots.txt',
      'Lo encontramos probando rutas típicas, pero un crawler no tiene por qué hacerlo.', `Añade a robots.txt: Sitemap: ${sitemap.url}`);
    if (!sitemap.count) add('medio', 'Sitemap', 'El sitemap no tiene URLs', 'Existe pero está vacío.');
    else if (!sitemap.withLastmod) add('bajo', 'Fechas', 'El sitemap no tiene fechas (lastmod)',
      'Es la forma más barata de decirles a los crawlers qué cambió y cuándo.',
      'En @astrojs/sitemap usa serialize para añadir lastmod.');
    else if (sitemap.sameDate) add('bajo', 'Fechas', 'Todas las URLs del sitemap tienen la misma fecha',
      'Suele pasar cuando la fecha es la del último build. Los buscadores aprenden que esa fecha no significa nada.',
      'Usa la fecha real de modificación de cada página.');
  }
  if (freshness) {
    const months = Math.round(freshness.days / 30);
    if (freshness.days > 365) add('medio', 'Fechas', `Lo más reciente que encontramos es de hace ${months} meses`,
      `Según ${freshness.source}. En preguntas donde la actualidad importa, una fuente antigua compite en desventaja.`,
      'Actualiza el contenido clave y su dateModified.');
    else if (freshness.days > 180) add('bajo', 'Fechas', `Lo más reciente que encontramos es de hace ${months} meses`, `Según ${freshness.source}.`);
    else if (freshness.days <= 90) good.push(`Hay una fecha reciente: hace ${freshness.days} días (${freshness.source}).`);
  } else add('bajo', 'Fechas', 'No hay ninguna fecha legible por máquinas',
    'Ni el schema, ni las meta etiquetas, ni el sitemap dicen cuándo se actualizó el contenido.',
    'Añade dateModified en el schema y lastmod en el sitemap.');

  const bad = samples.filter(s => s.status !== 200 || s.redirected);
  if (bad.length) add('medio', 'Sitemap', `${bad.length} de ${samples.length} URLs del sitemap no cargan directamente`,
    list(bad.map(s => `${s.path} → ${s.redirected ? 'redirige' : s.status || s.note}`)),
    'El sitemap solo debería tener URLs finales que respondan 200.');
  const sNo = samples.filter(s => s.noindex);
  if (sNo.length) add('medio', 'Sitemap', 'Hay páginas del sitemap marcadas noindex',
    `${list(sNo.map(s => s.path))}. El sitemap dice "lee esto" y la página dice "no me indexes".`,
    'Saca esas URLs del sitemap o quita el noindex.');
  const sThin = samples.filter(s => s.status === 200 && s.words < 100);
  if (sThin.length) add('medio', 'Contenido', 'Páginas internas con poco texto en el HTML',
    `${list(sThin.map(s => `${s.path} (${s.words} palabras)`))}.`,
    'Comprueba que esas páginas no cargan su contenido con JavaScript.');
  const sBlk = samples.filter(s => s.blockedFor.length);
  if (sBlk.length) add('alto', 'Acceso', 'robots.txt bloquea páginas internas a bots de búsqueda',
    list(sBlk.map(s => `${s.path}: ${list(s.blockedFor)}`)), 'Revisa las reglas Disallow con rutas.');
  if (samples.length && !bad.length && !sNo.length && !sThin.length && !sBlk.length) {
    good.push(`Las ${samples.length} páginas internas que probamos cargan bien y tienen contenido.`);
  }

  if (llms.found) good.push(`Tienes llms.txt con ${llms.links} enlaces${llms.full ? ', y también llms-full.txt' : ''}.`);
  else if (llms.html) add('bajo', 'llms.txt', '/llms.txt devuelve una página HTML',
    'Quien lo busque recibe tu web en lugar de un archivo de texto.', 'Si no lo vas a usar, haz que devuelva 404.');
  else add('info', 'llms.txt', 'No tienes llms.txt',
    'Es una propuesta para dar a los modelos un índice en Markdown de tu sitio. No está claro que los grandes buscadores lo usen, pero cuesta poco ponerlo.',
    'Crea public/llms.txt con un "# Título", un resumen y enlaces a tus páginas clave.');

  return { F, good };
}

async function analyze(input) {
  const started = Date.now();
  const target = normalize(input);
  await assertPublic(target.hostname);

  const checked = new Map();
  const safe = h => {
    if (!checked.has(h)) checked.set(h, assertPublic(h).then(() => true, () => false));
    return checked.get(h);
  };
  checked.set(target.hostname, Promise.resolve(true));

  const base = target.origin;
  const path = target.pathname + target.search;
  const host = target.hostname.replace(/^www\./, '');
  const live = BOTS.filter(b => b.ua);

  const [robotsRes, browser, llmsRes, llmsFullRes, ...botRes] = await Promise.all([
    get(base + '/robots.txt', BROWSER_UA, 'text/plain,*/*'),
    get(target.href),
    get(base + '/llms.txt', BROWSER_UA, 'text/plain,text/markdown,*/*', 6000),
    get(base + '/llms-full.txt', BROWSER_UA, 'text/plain,text/markdown,*/*', 6000),
    ...live.map(b => get(target.href, b.ua)),
  ]);

  if (browser.err && botRes.every(r => r.err)) throw new Error(`No pudimos abrir la página (${browser.err}).`);

  const robots = readRobots(robotsRes);
  const browserWords = browser.ok ? countWords(toText(mainHtml(browser.body))) : 0;

  const viewIdx = botRes.findIndex(r => r.ok && !looksLikeChallenge(r));
  const view = viewIdx >= 0 ? botRes[viewIdx] : browser;
  const viewAs = viewIdx >= 0 ? live[viewIdx].name : 'un navegador';
  const viewUA = viewIdx >= 0 ? live[viewIdx].ua : BROWSER_UA;
  const page = view.ok ? analyzePage(view, base, host) : null;

  const bots = BOTS.map(b => {
    const i = live.indexOf(b);
    return {
      name: b.name, company: b.company, type: b.type,
      product: b.product || '', note: b.note || '', token: !!b.token,
      robots: robotsVerdict(robots, b.name, path),
      live: i >= 0 ? liveVerdict(botRes[i], browser, browserWords) : null,
    };
  });

  const sitemap = await readSitemap(base, robots.sitemaps || [], safe);

  const pool = [...new Set(sitemap.urls)].filter(u => {
    try {
      const x = new URL(u);
      return x.hostname.replace(/^www\./, '') === host && trimSlash(x.pathname) !== trimSlash(target.pathname);
    } catch { return false; }
  });
  const picks = pickSpread(pool, 3);
  const sampleRes = await Promise.all(picks.map(async u =>
    (await safe(new URL(u).hostname)) ? get(u, viewUA, undefined, 7000) : { err: 'host no permitido' }));
  const searchBots = BOTS.filter(b => b.type !== 'entrenamiento');
  const samples = picks.map((u, i) => {
    const r = sampleRes[i];
    const x = new URL(u);
    const p = x.pathname + x.search;
    const blockedFor = robots.state === 'servererror' ? [] :
      searchBots.filter(b => !robotsVerdict(robots, b.name, p).allowed).map(b => b.name);
    if (r.err) return { url: u, path: p, status: null, note: r.err, words: 0, noindex: false, blockedFor, types: [] };
    const noindex = metas(r.body).some(m => BOT_META.test(m.name) && /\b(noindex|none)\b/i.test(m.content)) ||
      /noindex/i.test(r.headers.get('x-robots-tag') || '');
    let redirected = false;
    try { redirected = r.redirected && trimSlash(new URL(r.finalUrl).pathname) !== trimSlash(x.pathname); } catch {}
    return {
      url: u, path: p, status: r.status, redirected,
      title: toText((r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).slice(0, 90),
      words: r.ok ? countWords(toText(mainHtml(r.body))) : 0,
      noindex, blockedFor,
      types: r.ok ? summarizeSchema(parseSchema(r.body)).types.slice(0, 4) : [],
    };
  });

  const llms = { ...readLlms(llmsRes), full: readLlms(llmsFullRes).found };

  let newest = null;
  const cands = [
    ...(page?.dates || []).map(d => ({ d, src: 'los datos de la página' })),
    ...sitemap.mods.map(d => ({ d, src: 'el sitemap' })),
  ];
  for (const c of cands) {
    const t = Date.parse(c.d);
    if (!isNaN(t) && t < Date.now() + 864e5 && t > Date.parse('1996-01-01') && (!newest || t > newest.t)) newest = { t, src: c.src };
  }
  const freshness = newest
    ? { date: new Date(newest.t).toISOString(), days: Math.max(0, Math.floor((Date.now() - newest.t) / 864e5)), source: newest.src }
    : null;

  const { F, good } = buildFindings({
    robots, bots, page, viewAs, browser, sitemap, samples, llms, freshness, base, host, liveCount: live.length,
  });
  const order = { alto: 0, medio: 1, bajo: 2, info: 3 };
  F.sort((a, b) => order[a.level] - order[b.level]);
  const counts = { alto: 0, medio: 0, bajo: 0, info: 0 };
  for (const f of F) counts[f.level]++;

  const { urls, mods, ...sitemapOut } = sitemap;
  let pageOut = null;
  if (page) { const { dates, robotsMeta, ...rest } = page; pageOut = rest; }

  return {
    url: target.href, finalUrl: page?.finalUrl || browser.finalUrl || target.href,
    viewAs, ms: Date.now() - started, counts, findings: F, good,
    bots, robots: { state: robots.state, status: robots.status ?? null, groups: robots.groups ?? 0, sitemaps: robots.sitemaps || [] },
    page: pageOut, sitemap: sitemapOut, samples, llms, freshness,
  };
}

export async function GET({ url }) {
  const json = (data, status = 200, extra = {}) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
  const target = url.searchParams.get('url');
  if (!target) return json({ error: 'Falta el parámetro ?url=' }, 400);
  try {
    const data = await analyze(target);
    return json(data, 200, { 'cache-control': 'public, s-maxage=900, stale-while-revalidate=3600' });
  } catch (e) {
    return json({ error: e?.message || 'Error inesperado.' }, 400);
  }
}
