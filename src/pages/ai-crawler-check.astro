import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Falta el parámetro url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Normalizar URL
  let target: URL;
  try {
    target = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return new Response(JSON.stringify({ error: 'URL inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = target.origin;
  const start = Date.now();

  const UA_BROWSER = 'Mozilla/5.0 (compatible; AEOGrowth-Checker/1.0)';

  const BOTS = [
    { name: 'GPTBot',        company: 'OpenAI',     type: 'entrenamiento', product: 'ChatGPT',    note: '', token: false, ua: 'GPTBot/1.0' },
    { name: 'OAI-SearchBot', company: 'OpenAI',     type: 'busqueda',      product: 'ChatGPT Search', note: '', token: false, ua: 'OAI-SearchBot' },
    { name: 'ClaudeBot',     company: 'Anthropic',  type: 'entrenamiento', product: 'Claude',     note: '', token: false, ua: 'ClaudeBot/1.0' },
    { name: 'PerplexityBot', company: 'Perplexity', type: 'busqueda',      product: 'Perplexity', note: '', token: false, ua: 'PerplexityBot/1.0' },
    { name: 'Googlebot',     company: 'Google',     type: 'busqueda',      product: 'Google Search', note: '', token: false, ua: 'Googlebot/2.1' },
    { name: 'Google-Extended', company: 'Google',   type: 'entrenamiento', product: 'Bard/Gemini', note: '', token: true,  ua: 'Google-Extended' },
  ];

  // ── Fetch helpers ──
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

  // ── robots.txt ──
  const robotsUrl = `${origin}/robots.txt`;
  const robotsRes = await fetchText(robotsUrl, UA_BROWSER);
  const robotsText = robotsRes.text;

  function parseRobots(robotsTxt: string, userAgent: string): { allowed: boolean; rule: string | null; src: string; delay?: string | null } {
    const lines = robotsTxt.split('\n').map(l => l.trim());
    let currentAgents: string[] = [];
    let inBlock = false;
    let rules: { type: 'allow' | 'disallow'; path: string }[] = [];
    let delay: string | null = null;
    let globalRules: { type: 'allow' | 'disallow'; path: string }[] = [];
    let globalDelay: string | null = null;

    const uaLower = userAgent.toLowerCase();

    for (const line of lines) {
      if (line.startsWith('#') || line === '') {
        if (line === '' && inBlock) {
          if (currentAgents.some(a => a === uaLower)) {
            // keep block
          } else {
            currentAgents = [];
            inBlock = false;
            rules = [];
            delay = null;
          }
        }
        continue;
      }

      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();

      if (key.toLowerCase() === 'user-agent') {
        if (inBlock && currentAgents.some(a => a === uaLower)) {
          // already in our block
        } else {
          currentAgents = [val.toLowerCase()];
          inBlock = true;
          rules = [];
          delay = null;
        }
      } else if (key.toLowerCase() === 'disallow' && inBlock) {
        if (currentAgents.includes('*')) globalRules.push({ type: 'disallow', path: val });
        else rules.push({ type: 'disallow', path: val });
      } else if (key.toLowerCase() === 'allow' && inBlock) {
        if (currentAgents.includes('*')) globalRules.push({ type: 'allow', path: val });
        else rules.push({ type: 'allow', path: val });
      } else if (key.toLowerCase() === 'crawl-delay' && inBlock) {
        if (currentAgents.includes('*')) globalDelay = val;
        else delay = val;
      }
    }

    const path = target.pathname || '/';
    const checkRules = (r: { type: string; path: string }[]) => {
      const sorted = [...r].sort((a, b) => b.path.length - a.path.length);
      for (const rule of sorted) {
        if (!rule.path) continue;
        const pattern = rule.path.replace(/\*/g, '.*').replace(/\?/g, '\\?');
        if (new RegExp('^' + pattern).test(path)) {
          return rule.type === 'allow';
        }
      }
      return null;
    };

    const specificMatch = rules.some(r => r.type === 'disallow' && r.path === '/');
    if (currentAgents.some(a => a === uaLower) && rules.length > 0) {
      const result = checkRules(rules);
      if (result !== null) return { allowed: result, rule: rules.find(r => r.path === '/')?.path ?? null, src: userAgent, delay };
      return { allowed: true, rule: null, src: userAgent, delay };
    }

    // fallback a *
    const globalResult = checkRules(globalRules);
    if (globalResult !== null) return { allowed: globalResult, rule: '*', src: '*', delay: globalDelay };

    return { allowed: true, rule: null, src: 'default', delay: null };
  }

  // ── Visita real de la página ──
  const pageRes = await fetchText(target.href, UA_BROWSER);
  const html = pageRes.text;
  const finalUrl = pageRes.finalUrl || target.href;

  // Palabras
  const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

  // noindex
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

  // Schema.org JSON-LD
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
    } catch {
      schemaBroken++;
    }
  }

  const microdata = /itemscope/i.test(html);

  // Fecha
  let freshness: { date: string; days: number; source: string } | null = null;
  const datePatterns = [
    { re: /<meta[^>]+property=["']article:modified_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:modified_time' },
    { re: /<meta[^>]+property=["']article:published_time["'][^>]*content=["']([^"']+)/i, src: 'meta article:published_time' },
    { re: /"dateModified"\s*:\s*"([^"]+)"/i, src: 'schema dateModified' },
    { re: /"datePublished"\s*:\s*"([^"]+)"/i, src: 'schema datePublished' },
  ];
  for (const { re, src } of datePatterns) {
    const m = html.match(re);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) {
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        freshness = { date: m[1], days, source: src };
        break;
      }
    }
  }

  // ── Sitemap ──
  const sitemapUrls = [`${origin}/sitemap-index.xml`, `${origin}/sitemap.xml`];
  let sitemapData: { found: boolean; url?: string; inRobots?: boolean; children?: number; count: number; withLastmod: number; newest?: string | null; sameDate?: boolean } = { found: false, count: 0, withLastmod: 0 };

  const sitemapInRobots = /sitemap:/i.test(robotsText);
  const sitemapFromRobots = robotsText.match(/sitemap:\s*(https?:\/\/[^\s]+)/i)?.[1];
  if (sitemapFromRobots) sitemapUrls.unshift(sitemapFromRobots);

  for (const smUrl of sitemapUrls) {
    const smRes = await fetchText(smUrl, UA_BROWSER);
    if (!smRes.ok) continue;
    const smText = smRes.text;
    const urlMatches = [...smText.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
    const lastmods = [...smText.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/gi)].map(m => m[1].trim());
    const isIndex = /<sitemapindex/i.test(smText);
    const childSitemaps = isIndex ? urlMatches.length : undefined;

    sitemapData = {
      found: true,
      url: smUrl,
      inRobots: sitemapInRobots,
      children: childSitemaps,
      count: urlMatches.length,
      withLastmod: lastmods.length,
      newest: lastmods.length ? lastmods.sort().reverse()[0] : null,
      sameDate: lastmods.length > 1 && new Set(lastmods).size === 1,
    };
    break;
  }

  // ── Samples ──
  const samples: { url: string; path: string; status: number | null; note?: string; redirected?: boolean; title?: string; words: number; noindex: boolean; blockedFor: string[]; types: string[] }[] = [];

  if (sitemapData.found && sitemapData.url) {
    const smRes = await fetchText(sitemapData.url, UA_BROWSER);
    const smUrls = [...smRes.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
      .map(m => m[1].trim())
      .filter(u => u.startsWith(origin) && u !== target.href)
      .slice(0, 5);

    for (const u of smUrls) {
      const r = await fetchText(u, UA_BROWSER);
      const w = r.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
      const ni = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.text);
      const title = r.text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
      const path = new URL(u).pathname;
      const types = [...r.text.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)].map(m => m[1]);
      samples.push({ url: u, path, status: r.status, redirected: r.finalUrl !== u, title, words: w, noindex: ni, blockedFor: [], types: [...new Set(types)] });
    }
  }

  // ── Bots ──
  const bots = await Promise.all(BOTS.map(async (bot) => {
    const robotsResult = parseRobots(robotsText, bot.ua);
    let live: { blocked: boolean; note: string } | null = null;

    if (!bot.token) {
      const r = await fetchText(target.href, bot.ua);
      if (r.status !== null) {
        const blocked = r.status === 403 || r.status === 401 || r.status === 429 ||
          /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(r.text);
        live = { blocked, note: `HTTP ${r.status}` };
      }
    }

    return { ...bot, robots: robotsResult, live };
  }));

  // ── Findings ──
  type Level = 'alto' | 'medio' | 'bajo' | 'info';
  const findings: { level: Level; area: string; title: string; detail: string; fix: string }[] = [];
  const good: string[] = [];

  const blockedBots = bots.filter(b => !b.robots.allowed);
  if (blockedBots.length) {
    findings.push({
      level: 'alto',
      area: 'Acceso',
      title: `${blockedBots.map(b => b.name).join(', ')} bloqueado${blockedBots.length > 1 ? 's' : ''} en robots.txt`,
      detail: 'Estos bots no pueden rastrear tu web según tus reglas de robots.txt.',
      fix: 'Revisa tu robots.txt y elimina o ajusta las reglas que bloquean estos agentes.',
    });
  } else {
    good.push('Todos los bots principales tienen acceso según robots.txt.');
  }

  if (noindex) {
    findings.push({ level: 'alto', area: 'Indexación', title: 'La página tiene noindex', detail: 'La meta etiqueta robots incluye noindex, lo que impide que los buscadores la indexen.', fix: 'Elimina el noindex si quieres que esta página sea visible.' });
  }

  if (!sitemapData.found) {
    findings.push({ level: 'medio', area: 'Sitemap', title: 'No hay sitemap', detail: 'No encontramos sitemap.xml ni sitemap-index.xml.', fix: 'Crea un sitemap y decláralo en robots.txt.' });
  } else {
    good.push('Sitemap encontrado y accesible.');
  }

  if (!freshness) {
    findings.push({ level: 'bajo', area: 'Fechas', title: 'Sin fecha legible por máquinas', detail: 'No hay fecha de publicación o modificación en el schema ni en las meta etiquetas.', fix: 'Añade datePublished y dateModified en tu JSON-LD.' });
  }

  if (schemaBlocks === 0 && !microdata) {
    findings.push({ level: 'medio', area: 'Schema', title: 'Sin datos estructurados', detail: 'La página no tiene JSON-LD ni microdata.', fix: 'Añade al menos un bloque JSON-LD con el tipo de contenido principal.' });
  } else {
    good.push('La página tiene datos estructurados.');
  }

  if (words < 300) {
    findings.push({ level: 'bajo', area: 'Contenido', title: 'Poco contenido', detail: `La página tiene aproximadamente ${words} palabras, lo que puede ser insuficiente para los crawlers.`, fix: 'Amplía el contenido para que los bots tengan más información que procesar.' });
  } else {
    good.push(`Contenido suficiente (${words} palabras).`);
  }

  const counts: Record<Level, number> = { alto: 0, medio: 0, bajo: 0, info: 0 };
  for (const f of findings) counts[f.level]++;

  const report = {
    finalUrl,
    viewAs: UA_BROWSER,
    ms: Date.now() - start,
    counts,
    findings,
    good,
    bots,
    page: { schema: { blocks: schemaBlocks, broken: schemaBroken, microdata, types: schemaTypes, entities } },
    sitemap: sitemapData,
    freshness,
    samples,
  };

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
