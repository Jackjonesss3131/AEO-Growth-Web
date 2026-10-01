import type { APIRoute } from 'astro';

export const prerender = false;

/* ─────────── config ─────────── */

const UA_BROWSER = 'Mozilla/5.0 (compatible; AEOGrowth-Checker/1.0)';
const TIMEOUT = 8000;
const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

type BotKind = 'search' | 'training' | 'user';

interface BotDef {
  name: string;
  token: string;   // token used in robots.txt
  ua: string;      // full UA for the live request
  company: string;
  kind: BotKind;
  product: string;
  cites: boolean;  // blocking it removes you from cited answers
  live: boolean;   // we actually request the page as this bot
}

const BOTS: BotDef[] = [
  { name: 'OAI-SearchBot', token: 'oai-searchbot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot', company: 'OpenAI', kind: 'search', product: 'ChatGPT Search', cites: true, live: true },
  { name: 'ChatGPT-User', token: 'chatgpt-user', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot', company: 'OpenAI', kind: 'user', product: 'ChatGPT browsing', cites: true, live: false },
  { name: 'GPTBot', token: 'gptbot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot', company: 'OpenAI', kind: 'training', product: 'Model training', cites: false, live: true },
  { name: 'Claude-SearchBot', token: 'claude-searchbot', ua: 'Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +https://anthropic.com/claude-searchbot)', company: 'Anthropic', kind: 'search', product: 'Claude search', cites: true, live: true },
  { name: 'Claude-User', token: 'claude-user', ua: 'Mozilla/5.0 (compatible; Claude-User/1.0; +https://anthropic.com/claude-user)', company: 'Anthropic', kind: 'user', product: 'Claude browsing', cites: true, live: false },
  { name: 'ClaudeBot', token: 'claudebot', ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', company: 'Anthropic', kind: 'training', product: 'Model training', cites: false, live: true },
  { name: 'PerplexityBot', token: 'perplexitybot', ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', company: 'Perplexity', kind: 'search', product: 'Perplexity index', cites: true, live: true },
  { name: 'Perplexity-User', token: 'perplexity-user', ua: 'Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)', company: 'Perplexity', kind: 'user', product: 'Perplexity answers', cites: true, live: false },
  { name: 'Googlebot', token: 'googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', company: 'Google', kind: 'search', product: 'Search + AI Overviews', cites: true, live: true },
  { name: 'Google-Extended', token: 'google-extended', ua: '', company: 'Google', kind: 'training', product: 'Gemini training', cites: false, live: false },
  { name: 'Bingbot', token: 'bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', company: 'Microsoft', kind: 'search', product: 'Bing + Copilot', cites: true, live: true },
  { name: 'Applebot', token: 'applebot', ua: 'Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)', company: 'Apple', kind: 'search', product: 'Siri / Spotlight', cites: true, live: false },
  { name: 'Applebot-Extended', token: 'applebot-extended', ua: '', company: 'Apple', kind: 'training', product: 'Apple Intelligence', cites: false, live: false },
  { name: 'Meta-ExternalAgent', token: 'meta-externalagent', ua: '', company: 'Meta', kind: 'training', product: 'Meta AI', cites: false, live: false },
  { name: 'CCBot', token: 'ccbot', ua: '', company: 'Common Crawl', kind: 'training', product: 'Open dataset', cites: false, live: false },
  { name: 'Amazonbot', token: 'amazonbot', ua: '', company: 'Amazon', kind: 'search', product: 'Alexa / Rufus', cites: true, live: false },
];

/* ─────────── helpers ─────────── */

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|\[?::1\]?|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
  });

async function fetchDoc(url: string, ua: string) {
  const t0 = Date.now();
  try {
    const headers: Record<string, string> = {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (ua) headers['User-Agent'] = ua;
    const r = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, finalUrl: r.url || url, headers: r.headers, ms: Date.now() - t0, error: null as string | null };
  } catch (e) {
    return { ok: false, status: null as number | null, text: '', finalUrl: url, headers: new Headers(), ms: Date.now() - t0, error: e instanceof Error ? e.name : 'error' };
  }
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/* ─────────── robots.txt ─────────── */

interface RobotsGroup { agents: string[]; rules: { allow: boolean; path: string }[]; delay: string | null }

function parseRobots(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let cur: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();

    if (key === 'user-agent') {
      // consecutive user-agent lines share one group; a new one starts after rules
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [], delay: null };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: val });
    else if (key === 'crawl-delay') cur.delay = val;
    lastWasAgent = false;
  }
  return groups;
}

function matchPath(pattern: string, path: string): boolean {
  let p = pattern;
  let end = false;
  if (p.endsWith('$')) { end = true; p = p.slice(0, -1); }
  const body = p.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  try { return new RegExp('^' + body + (end ? '$' : '')).test(path); } catch { return false; }
}

function decide(groups: RobotsGroup[], token: string, path: string) {
  const t = token.toLowerCase();
  const exact = groups.filter((g) => g.agents.includes(t));
  const wild = groups.filter((g) => g.agents.includes('*'));
  const used = exact.length ? exact : wild;
  const src = exact.length ? token : wild.length ? '*' : 'default';

  if (!used.length) return { allowed: true, matched: null as string | null, src: 'default', delay: null as string | null };

  const rules = used.flatMap((g) => g.rules);
  const delay = used.map((g) => g.delay).find(Boolean) ?? null;

  let best: { allow: boolean; path: string } | null = null;
  for (const r of rules) {
    if (r.path === '') continue; // "Disallow:" with no value = no restriction
    if (!matchPath(r.path, path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  if (!best) return { allowed: true, matched: null, src, delay };
  return { allowed: best.allow, matched: `${best.allow ? 'Allow' : 'Disallow'}: ${best.path}`, src, delay };
}

/* ─────────── html ─────────── */

const stripNonText = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

function textOf(html: string) {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  return stripNonText(body)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#\d+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const wordsOf = (html: string) => {
  const t = textOf(html);
  return t ? t.split(' ').length : 0;
};

const attr = (html: string, re: RegExp) => html.match(re)?.[1]?.trim() ?? '';

function collectSchema(input: unknown, out: Record<string, any>[] = []): Record<string, any>[] {
  if (Array.isArray(input)) { input.forEach((i) => collectSchema(i, out)); return out; }
  if (input && typeof input === 'object') {
    const o = input as Record<string, any>;
    if (o['@graph']) collectSchema(o['@graph'], out);
    if (o['@type']) out.push(o);
  }
  return out;
}

const typeName = (t: unknown) => (Array.isArray(t) ? t.join(' / ') : String(t ?? 'Unknown'));

/* ─────────── route ─────────── */

type Level = 'critical' | 'high' | 'medium' | 'low';
interface Finding { id: string; level: Level; area: string; title: string; detail: string; evidence: string; fix: string }

export const GET: APIRoute = async ({ request }) => {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) return json({ error: 'Missing url parameter' }, 400);

  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return json({ error: 'That URL does not look valid.' }, 400);
  }
  if (!/^https?:$/.test(target.protocol)) return json({ error: 'Only http and https URLs are supported.' }, 400);
  if (PRIVATE_HOST.test(target.hostname) || !target.hostname.includes('.')) {
    return json({ error: 'That host cannot be analyzed.' }, 400);
  }

  const key = target.href;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return new Response(hit.body, { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } });
  }

  const origin = target.origin;
  const path = target.pathname || '/';
  const start = Date.now();

  /* 1. parallel base fetches */
  const [robotsRes, pageRes, llmsRes] = await Promise.all([
    fetchDoc(`${origin}/robots.txt`, UA_BROWSER),
    fetchDoc(target.href, UA_BROWSER),
    fetchDoc(`${origin}/llms.txt`, UA_BROWSER),
  ]);

  if (pageRes.status === null) {
    return json({ error: `We could not reach ${target.hostname} (${pageRes.error}). It may be down or too slow.` }, 502);
  }

  const robotsText = robotsRes.ok ? robotsRes.text : '';
  const robotsMissing = !robotsRes.ok;
  const groups = parseRobots(robotsText);

  const html = pageRes.text;
  const finalUrl = pageRes.finalUrl;
  const redirected = finalUrl !== target.href;
  const words = wordsOf(html);

  const xRobots = pageRes.headers.get('x-robots-tag') ?? '';
  const metaRobots = attr(html, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)/i);
  const noindex = /noindex/i.test(metaRobots) || /noindex/i.test(xRobots);
  const nofollowAll = /\bnofollow\b/i.test(metaRobots);

  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, ' ');
  const description = attr(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i);
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const subheads = [...html.matchAll(/<h[23][^>]*>/gi)].length;
  const scripts = [...html.matchAll(/<script\b/gi)].length;
  const emptyRoot = /<div[^>]+id=["'](root|app|__next|__nuxt|___gatsby)["'][^>]*>\s*<\/div>/i.test(html);
  const jsDependent = words < 200 && html.length > 2000 && (emptyRoot || scripts >= 4);

  /* 2. structured data */
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let schemaBroken = 0;
  const schemaTypes: string[] = [];
  const entities: { type: string; name: string; missing: string[]; sameAs: number; questions?: number }[] = [];

  for (const m of ldBlocks) {
    try {
      for (const node of collectSchema(JSON.parse(m[1].trim()))) {
        const type = typeName(node['@type']);
        if (!schemaTypes.includes(type)) schemaTypes.push(type);
        const missing: string[] = [];
        if (!node.name && !node.headline) missing.push('name');
        if (!node.description) missing.push('description');
        if (!node.url && !node['@id']) missing.push('url');
        entities.push({
          type,
          name: String(node.name ?? node.headline ?? ''),
          missing,
          sameAs: Array.isArray(node.sameAs) ? node.sameAs.length : node.sameAs ? 1 : 0,
          questions: node.mainEntity ? (Array.isArray(node.mainEntity) ? node.mainEntity.length : 1) : undefined,
        });
      }
    } catch {
      schemaBroken++;
    }
  }
  const microdata = /\bitemscope\b/i.test(html);
  const hasIdentity = entities.some((e) => /Organization|Person|LocalBusiness|WebSite/i.test(e.type));
  const identityLinked = entities.some((e) => /Organization|Person|LocalBusiness/i.test(e.type) && e.sameAs > 0);

  /* 3. freshness */
  let freshness: { date: string; days: number; source: string } | null = null;
  for (const { re, src } of [
    { re: /<meta[^>]+property=["']article:modified_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:modified_time' },
    { re: /"dateModified"\s*:\s*"([^"]+)"/i, src: 'schema dateModified' },
    { re: /<meta[^>]+property=["']article:published_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:published_time' },
    { re: /"datePublished"\s*:\s*"([^"]+)"/i, src: 'schema datePublished' },
    { re: /<time[^>]+datetime=["']([^"']+)/i, src: '<time datetime>' },
  ]) {
    const m = html.match(re);
    if (!m) continue;
    const d = new Date(m[1]);
    if (isNaN(d.getTime())) continue;
    freshness = { date: m[1], days: Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)), source: src };
    break;
  }

  /* 4. sitemap */
  const declared = [...robotsText.matchAll(/sitemap:\s*(\S+)/gi)].map((m) => m[1]);
  const candidates = [...declared, `${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`];

  let sitemap = {
    found: false, url: '', inRobots: declared.length > 0,
    children: undefined as number | undefined,
    count: 0, withLastmod: 0, newest: null as string | null, sameDate: false,
  };
  let pageUrls: string[] = [];

  for (const smUrl of candidates) {
    const res = await fetchDoc(smUrl, UA_BROWSER);
    if (!res.ok || !/<(urlset|sitemapindex)/i.test(res.text)) continue;
    const isIndex = /<sitemapindex/i.test(res.text);
    const locs = [...res.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => m[1].trim());
    const lastmods = [...res.text.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/gi)].map((m) => m[1].trim());

    if (isIndex) {
      const child = await fetchDoc(locs[0] ?? '', UA_BROWSER);
      const childLocs = [...child.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((m) => m[1].trim());
      const childMods = [...child.text.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/gi)].map((m) => m[1].trim());
      pageUrls = childLocs;
      sitemap = { found: true, url: smUrl, inRobots: declared.length > 0, children: locs.length, count: childLocs.length, withLastmod: childMods.length, newest: childMods.sort().at(-1) ?? null, sameDate: childMods.length > 1 && new Set(childMods).size === 1 };
    } else {
      pageUrls = locs;
      sitemap = { found: true, url: smUrl, inRobots: declared.length > 0, children: undefined, count: locs.length, withLastmod: lastmods.length, newest: lastmods.sort().at(-1) ?? null, sameDate: lastmods.length > 1 && new Set(lastmods).size === 1 };
    }
    break;
  }

  /* 5. bots: robots.txt for all, live request for a representative subset */
  const bots = await pool(BOTS, 4, async (bot) => {
    const robots = decide(groups, bot.token, path);
    let live: { blocked: boolean; status: number | null; note: string } | null = null;
    if (bot.live && bot.ua) {
      const r = await fetchDoc(target.href, bot.ua);
      if (r.status !== null) {
        const thin = words > 150 && wordsOf(r.text) < words * 0.5;
        const blocked = [401, 403, 429, 451, 503].includes(r.status) || thin;
        live = {
          blocked,
          status: r.status,
          note: thin ? `HTTP ${r.status}, but served ${wordsOf(r.text)} words vs ${words} to a browser` : `HTTP ${r.status}`,
        };
      } else live = { blocked: true, status: null, note: `no response (${r.error})` };
    }
    const { ua, ...rest } = bot;
    return { ...rest, robots, live };
  });

  /* 6. sample internal pages */
  const sampleUrls = pageUrls.filter((u) => u.startsWith(origin) && u !== finalUrl).slice(0, 5);
  const samples = await pool(sampleUrls, 3, async (u) => {
    const r = await fetchDoc(u, UA_BROWSER);
    const p = new URL(u).pathname;
    const types = [...new Set([...r.text.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)].map((m) => m[1]))];
    return {
      url: u, path: p, status: r.status,
      redirected: r.finalUrl !== u,
      title: attr(r.text, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, ' '),
      words: wordsOf(r.text),
      noindex: /noindex/i.test(attr(r.text, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)/i)) || /noindex/i.test(r.headers.get('x-robots-tag') ?? ''),
      allowed: decide(groups, 'oai-searchbot', p).allowed,
      types: types.slice(0, 4),
    };
  });

  /* ─────────── findings ─────────── */

  const findings: Finding[] = [];
  const good: string[] = [];
  const add = (f: Finding) => findings.push(f);

  const blockedCiting = bots.filter((b) => b.cites && !b.robots.allowed);
  const blockedTraining = bots.filter((b) => !b.cites && !b.robots.allowed);
  const liveBlocked = bots.filter((b) => b.live?.blocked);

  if (blockedCiting.length) {
    add({
      id: 'robots-citing', level: 'critical', area: 'Access',
      title: `${blockedCiting.length} bot${blockedCiting.length > 1 ? 's' : ''} that can cite you are blocked`,
      detail: 'These crawlers are the ones that fetch pages to answer questions and link back to the source. Blocking them means you cannot appear as a citation, no matter how good the content is.',
      evidence: blockedCiting.map((b) => `${b.name} → ${b.robots.matched ?? 'blocked'} (group: ${b.robots.src})`).join(' · '),
      fix: `Edit /robots.txt and remove or narrow the Disallow rules for ${blockedCiting.map((b) => b.name).join(', ')}.`,
    });
  } else {
    good.push('Every AI bot that can cite you is allowed in robots.txt.');
  }

  if (blockedTraining.length) {
    add({
      id: 'robots-training', level: 'low', area: 'Access',
      title: `${blockedTraining.length} training crawler${blockedTraining.length > 1 ? 's are' : ' is'} blocked`,
      detail: 'These bots collect data to train models. They do not send traffic or citations, so blocking them is a valid choice — just confirm it was intentional.',
      evidence: blockedTraining.map((b) => `${b.name} → ${b.robots.matched ?? 'blocked'}`).join(' · '),
      fix: 'No action needed if this was deliberate. Allow them if you want your content represented inside the models themselves.',
    });
  }

  if (liveBlocked.length) {
    add({
      id: 'live-block', level: 'critical', area: 'Access',
      title: 'Your server turns bots away even though robots.txt allows them',
      detail: 'robots.txt is only a declaration. When we requested the page identifying as these bots, the server refused or returned far less content than it gives a browser. This is usually a WAF, Cloudflare bot-fight mode, or rate limiting.',
      evidence: liveBlocked.map((b) => `${b.name}: ${b.live!.note}`).join(' · '),
      fix: 'Allow these user agents in your firewall / CDN bot rules, or verify them by IP range instead of blocking them.',
    });
  }

  if (noindex) {
    add({
      id: 'noindex', level: 'critical', area: 'Indexing',
      title: 'This page tells crawlers not to index it',
      detail: 'A noindex directive removes the page from search results and from the indexes AI search tools query.',
      evidence: [metaRobots && `<meta name="robots" content="${metaRobots}">`, xRobots && `X-Robots-Tag: ${xRobots}`].filter(Boolean).join(' · '),
      fix: 'Remove the noindex value if this page is meant to be found.',
    });
  }

  if (jsDependent) {
    add({
      id: 'js-content', level: 'high', area: 'Content',
      title: 'Your content is rendered by JavaScript',
      detail: 'The raw HTML has almost no text — it is filled in by JavaScript in the browser. Most AI crawlers do not run JavaScript, so they see an empty page.',
      evidence: `${words} words in the raw HTML, ${scripts} script tags${emptyRoot ? ', empty root container found' : ''}`,
      fix: 'Enable server-side rendering or static prerendering so the text is present in the initial HTML response.',
    });
  } else if (words < 300) {
    add({
      id: 'thin', level: 'medium', area: 'Content',
      title: 'This page has very little text',
      detail: 'There is not enough content for a model to understand the topic or extract a quotable passage.',
      evidence: `${words} words of visible body text (scripts and styles excluded)`,
      fix: 'Expand the page to at least 500–800 words of substantive, specific content.',
    });
  } else {
    good.push(`The page has ${words} words of real body text, enough to be understood and quoted.`);
  }

  if (!title) add({ id: 'title', level: 'medium', area: 'Content', title: 'The page has no title', detail: 'The title is the single strongest signal of what a page is about.', evidence: '<title> missing or empty', fix: 'Add a descriptive <title> of 50–60 characters.' });
  else if (title.length > 65) add({ id: 'title-long', level: 'low', area: 'Content', title: 'The title gets truncated', detail: 'Long titles are cut off in results and summaries.', evidence: `${title.length} characters: "${title.slice(0, 70)}…"`, fix: 'Shorten it to under 60 characters, keeping the key terms first.' });

  if (!description) add({ id: 'desc', level: 'low', area: 'Content', title: 'No meta description', detail: 'Crawlers often use it as the one-line summary of what the page offers.', evidence: '<meta name="description"> missing', fix: 'Add a 120–160 character description that answers "what is this page about".' });

  if (h1s.length === 0) add({ id: 'h1-missing', level: 'medium', area: 'Content', title: 'The page has no H1', detail: 'Without a main heading, crawlers have to infer the topic from scattered signals.', evidence: 'no <h1> element found', fix: 'Add exactly one H1 stating the page topic.' });
  else if (h1s.length > 1) add({ id: 'h1-many', level: 'low', area: 'Content', title: `The page has ${h1s.length} H1 headings`, detail: 'Multiple H1s blur which one is the actual topic.', evidence: h1s.slice(0, 3).map((h) => `"${h.slice(0, 40)}"`).join(' · '), fix: 'Keep one H1 and demote the rest to H2.' });

  if (words > 400 && subheads < 2) add({ id: 'structure', level: 'low', area: 'Content', title: 'Long page with almost no subheadings', detail: 'AI systems quote passages, not whole pages. Subheadings mark where each answer begins.', evidence: `${words} words, ${subheads} H2/H3 headings`, fix: 'Break the content into sections with H2/H3 headings phrased as the questions readers ask.' });

  if (!ldBlocks.length && !microdata) {
    add({ id: 'schema-none', level: 'medium', area: 'Structured Data', title: 'The page has no structured data', detail: 'Structured data states in machine-readable form what the page is, who publishes it, and how the entities relate. Without it, crawlers have to guess.', evidence: 'no JSON-LD blocks and no microdata found', fix: 'Add a JSON-LD block with Organization and WebPage (or Article/Product) including name, description and url.' });
  } else if (schemaBroken) {
    add({ id: 'schema-broken', level: 'medium', area: 'Structured Data', title: `${schemaBroken} structured data block${schemaBroken > 1 ? 's have' : ' has'} invalid JSON`, detail: 'A block that fails to parse is discarded entirely — the data inside it is not read at all.', evidence: `${schemaBroken} of ${ldBlocks.length} JSON-LD blocks failed to parse`, fix: 'Validate each block and fix the syntax (usually an unescaped quote or a trailing comma).' });
  } else {
    good.push(`Structured data found: ${schemaTypes.slice(0, 4).join(', ')}.`);
  }

  if (ldBlocks.length && !hasIdentity) {
    add({ id: 'schema-identity', level: 'medium', area: 'Structured Data', title: 'Your structured data never says who you are', detail: 'There is no Organization, LocalBusiness or Person node, so nothing connects this page to an identifiable publisher.', evidence: `types present: ${schemaTypes.join(', ') || 'none'}`, fix: 'Add an Organization node with name, url, logo and sameAs.' });
  } else if (hasIdentity && !identityLinked) {
    add({ id: 'schema-sameas', level: 'low', area: 'Structured Data', title: 'Your entity is not linked to anything external', detail: 'sameAs ties your brand to profiles models already know (LinkedIn, Wikipedia, Crunchbase). Without it, your entity floats unverified.', evidence: 'Organization/Person present with no sameAs values', fix: 'Add a sameAs array with your official profile URLs.' });
  }

  if (robotsMissing) add({ id: 'robots-missing', level: 'low', area: 'Access', title: 'No robots.txt found', detail: 'Everything is allowed by default, but you have no place to declare your sitemap or set per-bot rules.', evidence: `GET ${origin}/robots.txt → ${robotsRes.status ?? 'no response'}`, fix: 'Create /robots.txt with at minimum a Sitemap: line.' });

  if (!sitemap.found) {
    add({ id: 'sitemap-none', level: 'medium', area: 'Sitemap', title: 'No sitemap found', detail: 'A sitemap is how crawlers discover pages that are not linked from the homepage.', evidence: `checked robots.txt, /sitemap-index.xml and /sitemap.xml`, fix: 'Generate a sitemap.xml and declare it in robots.txt.' });
  } else {
    if (!sitemap.inRobots) add({ id: 'sitemap-undeclared', level: 'low', area: 'Sitemap', title: 'Your sitemap is not declared in robots.txt', detail: 'We found it by guessing the path. Crawlers that do not guess will miss it.', evidence: `${sitemap.url} exists, no Sitemap: line in robots.txt`, fix: `Add "Sitemap: ${sitemap.url}" to your robots.txt.` });
    else good.push('Your sitemap exists and is declared in robots.txt.');

    if (sitemap.count && !sitemap.withLastmod) add({ id: 'sitemap-lastmod', level: 'low', area: 'Sitemap', title: 'Your sitemap has no lastmod dates', detail: 'Crawlers use lastmod to decide what is worth re-fetching.', evidence: `${sitemap.count} URLs, 0 with <lastmod>`, fix: 'Emit a real lastmod per URL.' });
    else if (sitemap.sameDate) add({ id: 'sitemap-samedate', level: 'low', area: 'Sitemap', title: 'Every sitemap URL has the same date', detail: 'Identical timestamps usually mean the build date is being emitted instead of the real edit date, so the signal is ignored.', evidence: `all ${sitemap.count} URLs share lastmod ${sitemap.newest}`, fix: 'Use each page\'s actual last-modified date.' });
  }

  if (!freshness) add({ id: 'dates', level: 'low', area: 'Dates', title: 'Nothing tells crawlers when this was updated', detail: 'When two sources disagree, AI systems tend to favour the one that can prove it is recent.', evidence: 'no date in schema, meta tags or <time> elements', fix: 'Add datePublished and dateModified to your JSON-LD.' });
  else if (freshness.days > 540) add({ id: 'stale', level: 'low', area: 'Dates', title: 'The page looks stale', detail: 'The newest date on the page is old enough that crawlers may treat the content as outdated.', evidence: `${freshness.source}: ${freshness.date} (${freshness.days} days ago)`, fix: 'Review the content and update dateModified when you genuinely revise it.' });
  else good.push(`Last update is machine-readable: ${freshness.days === 0 ? 'today' : `${freshness.days} days ago`}.`);

  if (canonical) {
    try {
      const c = new URL(canonical, finalUrl);
      if (c.href.replace(/\/$/, '') !== finalUrl.replace(/\/$/, '')) {
        add({ id: 'canonical', level: 'medium', area: 'Indexing', title: 'The canonical points to a different URL', detail: 'You are telling crawlers that another page is the real version of this one, so this URL will not be indexed or cited on its own.', evidence: `canonical: ${c.href} · requested: ${finalUrl}`, fix: 'Point the canonical at this URL, or confirm the redirect to the canonical one is intentional.' });
      }
    } catch { /* ignore */ }
  } else {
    add({ id: 'canonical-none', level: 'low', area: 'Indexing', title: 'No canonical tag', detail: 'Without it, parameter and trailing-slash variants can be treated as separate competing pages.', evidence: '<link rel="canonical"> missing', fix: 'Add a self-referencing canonical to every page.' });
  }

  if (!llmsRes.ok) add({ id: 'llms', level: 'low', area: 'AI Discovery', title: 'No /llms.txt file', detail: 'An emerging convention: a plain-text map of your most important pages aimed at language models. Optional, but cheap to add and nothing else competes for that slot.', evidence: `GET ${origin}/llms.txt → ${llmsRes.status ?? 'no response'}`, fix: 'Publish /llms.txt listing your key pages with one-line descriptions.' });
  else good.push('You publish an /llms.txt file.');

  if (pageRes.ms > 3000) add({ id: 'slow', level: 'low', area: 'Performance', title: 'The page is slow to respond', detail: 'Crawlers work on a budget and drop slow pages before they finish reading them.', evidence: `${(pageRes.ms / 1000).toFixed(1)} s to first full response`, fix: 'Cache the HTML at the edge or cut server-side work on this route.' });

  const crawlDelay = bots.find((b) => b.robots.delay && Number(b.robots.delay) >= 10);
  if (crawlDelay) add({ id: 'crawl-delay', level: 'low', area: 'Access', title: 'Your crawl-delay is high', detail: 'Bots that honour it will fetch very few pages per visit, so large sites get indexed slowly or partially.', evidence: `Crawl-delay: ${crawlDelay.robots.delay} (group: ${crawlDelay.robots.src})`, fix: 'Lower it to 1–2 seconds, or remove it and control load at the CDN.' });

  if (nofollowAll) add({ id: 'nofollow', level: 'medium', area: 'Indexing', title: 'This page tells crawlers not to follow its links', detail: 'A nofollow robots directive stops discovery of everything linked from here.', evidence: `<meta name="robots" content="${metaRobots}">`, fix: 'Remove nofollow unless you deliberately want to cut off link discovery.' });

  const blockedSamples = samples.filter((s) => !s.allowed || s.noindex);
  if (blockedSamples.length) add({ id: 'samples-blocked', level: 'medium', area: 'Indexing', title: `${blockedSamples.length} of your sitemap URLs are unreachable to crawlers`, detail: 'A URL listed in the sitemap but blocked or noindexed sends contradictory signals and wastes crawl budget.', evidence: blockedSamples.map((s) => `${s.path} (${s.noindex ? 'noindex' : 'disallowed'})`).join(' · '), fix: 'Remove these URLs from the sitemap or unblock them.' });

  /* ─────────── score ─────────── */

  const WEIGHT: Record<Level, number> = { critical: 25, high: 13, medium: 6, low: 2 };
  const counts: Record<Level, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  let score = 100;
  for (const f of findings) { counts[f.level]++; score -= WEIGHT[f.level]; }
  score = Math.max(0, Math.min(100, score));

  const ORDER: Level[] = ['critical', 'high', 'medium', 'low'];
  findings.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));

  const body = JSON.stringify({
    finalUrl, redirected, viewAs: UA_BROWSER, ms: Date.now() - start, score, counts, findings, good, bots,
    page: {
      title, description, canonical, h1: h1s[0] ?? '', h1Count: h1s.length, subheads, words, responseMs: pageRes.ms, status: pageRes.status,
      schema: { blocks: ldBlocks.length, broken: schemaBroken, microdata, types: schemaTypes, entities },
    },
    sitemap, freshness, samples,
  });

  cache.set(key, { at: Date.now(), body });
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);

  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } });
};
