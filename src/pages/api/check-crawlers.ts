import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let target: URL;
  try {
    target = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = target.origin;
  const start = Date.now();
  const UA_BROWSER = 'Mozilla/5.0 (compatible; AEOGrowth-Checker/1.0)';

  const BOTS = [
    { name: 'GPTBot',         company: 'OpenAI',     type: 'training', product: 'ChatGPT',        note: '', token: false, ua: 'GPTBot/1.0' },
    { name: 'OAI-SearchBot',  company: 'OpenAI',     type: 'search',   product: 'ChatGPT Search', note: '', token: false, ua: 'OAI-SearchBot' },
    { name: 'ClaudeBot',      company: 'Anthropic',  type: 'training', product: 'Claude',         note: '', token: false, ua: 'ClaudeBot/1.0' },
    { name: 'PerplexityBot',  company: 'Perplexity', type: 'search',   product: 'Perplexity',     note: '', token: false, ua: 'PerplexityBot/1.0' },
    { name: 'Googlebot',      company: 'Google',     type: 'search',   product: 'Google Search',  note: '', token: false, ua: 'Googlebot/2.1' },
    { name: 'Google-Extended', company: 'Google',    type: 'training', product: 'Bard/Gemini',    note: '', token: true,  ua: 'Google-Extended' },
  ];

  const fetchText = async (url: string, ua: string) => {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': ua },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      return { ok: r.ok, status: r.status, text: await r.text(), finalUrl: r.url };
    } catch {
      return { ok: false, status: null, text: '', finalUrl: url };
    }
  };

  const robotsRes = await fetchText(`${origin}/robots.txt`, UA_BROWSER);
  const robotsText = robotsRes.text;

  function parseRobots(robotsTxt: string, userAgent: string) {
    const lines = robotsTxt.split('\n').map(l => l.trim());
    const uaLower = userAgent.toLowerCase();
    let currentAgents: string[] = [];
    let inBlock = false;
    let rules: { type: string; path: string }[] = [];
    let delay: string | null = null;
    let globalRules: { type: string; path: string }[] = [];
    let globalDelay: string | null = null;

    for (const line of lines) {
      if (line.startsWith('#')) continue;
      if (line === '') { inBlock = false; continue; }

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();

      if (key === 'user-agent') {
        if (!inBlock) { currentAgents = []; rules = []; delay = null; }
        currentAgents.push(val.toLowerCase());
        inBlock = true;
      } else if (key === 'disallow') {
        if (currentAgents.includes('*')) globalRules.push({ type: 'disallow', path: val });
        else rules.push({ type: 'disallow', path: val });
      } else if (key === 'allow') {
        if (currentAgents.includes('*')) globalRules.push({ type: 'allow', path: val });
        else rules.push({ type: 'allow', path: val });
      } else if (key === 'crawl-delay') {
        if (currentAgents.includes('*')) globalDelay = val;
        else delay = val;
      }
    }

    const path = target.pathname || '/';
    const checkRules = (r: { type: string; path: string }[]) => {
      for (const rule of [...r].sort((a, b) => b.path.length - a.path.length)) {
        if (!rule.path) continue;
        const pattern = '^' + rule.path.replace(/\*/g, '.*').replace(/\?/g, '\\?');
        if (new RegExp(pattern).test(path)) return rule.type === 'allow';
      }
      return null;
    };

    if (currentAgents.some(a => a === uaLower) && rules.length > 0) {
      const result = checkRules(rules);
      if (result !== null) return { allowed: result, rule: null, src: userAgent, delay };
      return { allowed: true, rule: null, src: userAgent, delay };
    }

    const globalResult = checkRules(globalRules);
    if (globalResult !== null) return { allowed: globalResult, rule: '*', src: '*', delay: globalDelay };

    return { allowed: true, rule: null, src: 'default', delay: null };
  }

  const pageRes = await fetchText(target.href, UA_BROWSER);
  const html = pageRes.text;
  const finalUrl = pageRes.finalUrl || target.href;
  const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

  const jsonldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let schemaBlocks = 0, schemaBroken = 0;
  const schemaTypes: string[] = [];
  const entities: { type: string; name: string; missing: string[]; sameAs?: string[]; questions?: number }[] = [];

  for (const m of jsonldMatches) {
    schemaBlocks++;
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        const type = item['@type'];
        if (type && !schemaTypes.includes(type)) schemaTypes.push(type);
        const missing: string[] = [];
        if (!item.name) missing.push('name');
        if (!item.description) missing.push('description');
        if (!item.url) missing.push('url');
        entities.push({ type: type || 'Unknown', name: item.name || '', missing, sameAs: item.sameAs, questions: item.mainEntity ? (Array.isArray(item.mainEntity) ? item.mainEntity.length : 1) : undefined });
      }
    } catch { schemaBroken++; }
  }

  const microdata = /itemscope/i.test(html);

  let freshness: { date: string; days: number; source: string } | null = null;
  for (const { re, src } of [
    { re: /<meta[^>]+property=["']article:modified_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:modified_time' },
    { re: /<meta[^>]+property=["']article:published_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:published_time' },
    { re: /"dateModified"\s*:\s*"([^"]+)"/i, src: 'schema dateModified' },
    { re: /"datePublished"\s*:\s*"([^"]+)"/i, src: 'schema datePublished' },
  ]) {
    const m = html.match(re);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) {
        freshness = { date: m[1], days: Math.floor((Date.now() - d.getTime()) / 86400000), source: src };
        break;
      }
    }
  }

  let sitemapData = { found: false, url: '', inRobots: false, children: undefined as number | undefined, count: 0, withLastmod: 0, newest: null as string | null, sameDate: false };
  const sitemapInRobots = /sitemap:/i.test(robotsText);
  const sitemapFromRobots = robotsText.match(/sitemap:\s*(https?:\/\/[^\s]+)/i)?.[1];
  const sitemapUrls = [sitemapFromRobots, `${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`].filter(Boolean) as string[];

  for (const smUrl of sitemapUrls) {
    const smRes = await fetchText(smUrl, UA_BROWSER);
    if (!smRes.ok) continue;
    const smText = smRes.text;
    const urlMatches = [...smText.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
    const lastmods = [...smText.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/gi)].map(m => m[1].trim());
    const isIndex = /<sitemapindex/i.test(smText);
    sitemapData = { found: true, url: smUrl, inRobots: sitemapInRobots, children: isIndex ? urlMatches.length : undefined, count: urlMatches.length, withLastmod: lastmods.length, newest: lastmods.length ? [...lastmods].sort().reverse()[0] : null, sameDate: lastmods.length > 1 && new Set(lastmods).size === 1 };
    break;
  }

  const samples: { url: string; path: string; status: number | null; redirected?: boolean; title?: string; words: number; noindex: boolean; blockedFor: string[]; types: string[] }[] = [];
  if (sitemapData.found) {
    const smRes = await fetchText(sitemapData.url, UA_BROWSER);
    const smUrls = [...smRes.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(m => m[1].trim()).filter(u => u.startsWith(origin) && u !== target.href).slice(0, 5);
    for (const u of smUrls) {
      const r = await fetchText(u, UA_BROWSER);
      const w = r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
      const ni = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.text);
      const title = r.text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
      const types = [...r.text.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)].map(m => m[1]);
      samples.push({ url: u, path: new URL(u).pathname, status: r.status, redirected: r.finalUrl !== u, title, words: w, noindex: ni, blockedFor: [], types: [...new Set(types)] });
    }
  }

  const bots = await Promise.all(BOTS.map(async (bot) => {
    const robots = parseRobots(robotsText, bot.ua);
    let live: { blocked: boolean; note: string } | null = null;
    if (!bot.token) {
      const r = await fetchText(target.href, bot.ua);
      if (r.status !== null) {
        const blocked = r.status === 403 || r.status === 401 || r.status === 429 || /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.text);
        live = { blocked, note: `HTTP ${r.status}` };
      }
    }
    return { ...bot, robots, live };
  }));

  type Level = 'alto' | 'medio' | 'bajo' | 'info';
  const findings: { level: Level; area: string; title: string; detail: string; fix: string }[] = [];
  const good: string[] = [];

  const blockedBots = bots.filter(b => !b.robots.allowed);
  if (blockedBots.length) {
    findings.push({
      level: 'alto',
      area: 'Access',
      title: `${blockedBots.map(b => b.name).join(', ')} can't access your site`,
      detail: `Your robots.txt is telling ${blockedBots.map(b => b.name).join(', ')} it can't visit your site. This means it won't be able to read your content or cite you.`,
      fix: 'Open your robots.txt file and remove the line blocking these bots.',
    });
  } else {
    good.push('All AI bots and search engines can access your site without restrictions.');
  }

  if (noindex) findings.push({
    level: 'alto',
    area: 'Indexing',
    title: 'This page is hidden from search engines',
    detail: 'You have a "noindex" tag in your page code. This tells Google and AI crawlers to ignore this page entirely.',
    fix: 'If you want this page to appear in search results and be cited by AIs, remove the noindex tag.',
  });

  if (!sitemapData.found) findings.push({
    level: 'medio',
    area: 'Sitemap',
    title: 'Your site has no sitemap',
    detail: 'A sitemap is a file that tells Google and AIs which pages exist on your site. Without it, they may miss important content.',
    fix: 'Create a sitemap.xml and reference it in your robots.txt so bots can find it easily.',
  });
  else good.push('Your site has a sitemap and bots can find it without issues.');

  if (!freshness) findings.push({
    level: 'bajo',
    area: 'Dates',
    title: "AIs don't know when you last updated your site",
    detail: "There's no machine-readable date in your page code. Without this, AIs can't tell if your content is recent or outdated, which may affect whether they cite you.",
    fix: "Add publication and last-updated dates to your page's structured data (JSON-LD).",
  });

  if (schemaBlocks === 0 && !microdata) findings.push({
    level: 'medio',
    area: 'Structured Data',
    title: "Your site doesn't tell AIs what it's about",
    detail: "Structured data is like a fact sheet that tells Google and AIs exactly what your site is, what it covers, and who's behind it. Without it, they have to guess.",
    fix: 'Add a JSON-LD block to your page with basic info: name, description, business type, and URL.',
  });
  else good.push("Your site has structured data and AIs can understand what it's about.");

  if (words < 300) findings.push({
    level: 'bajo',
    area: 'Content',
    title: 'This page has very little text',
    detail: `This page has around ${words} words. AIs need enough content to understand what your site is about and decide whether to cite it.`,
    fix: "Expand this page's content with more useful information for your visitors.",
  });
  else good.push(`This page has a solid amount of content (${words} words), enough for AIs to understand it.`);

  const counts: Record<Level, number> = { alto: 0, medio: 0, bajo: 0, info: 0 };
  for (const f of findings) counts[f.level]++;

  return new Response(JSON.stringify({
    finalUrl, viewAs: UA_BROWSER, ms: Date.now() - start, counts, findings, good, bots,
    page: { schema: { blocks: schemaBlocks, broken: schemaBroken, microdata, types: schemaTypes, entities } },
    sitemap: sitemapData, freshness, samples,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
