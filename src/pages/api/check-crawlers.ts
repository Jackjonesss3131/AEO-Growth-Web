import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Falta el parámetro url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
    { name: 'GPTBot',         company: 'OpenAI',     type: 'entrenamiento', product: 'ChatGPT',        note: '', token: false, ua: 'GPTBot/1.0' },
    { name: 'OAI-SearchBot',  company: 'OpenAI',     type: 'busqueda',      product: 'ChatGPT Search', note: '', token: false, ua: 'OAI-SearchBot' },
    { name: 'ClaudeBot',      company: 'Anthropic',  type: 'entrenamiento', product: 'Claude',         note: '', token: false, ua: 'ClaudeBot/1.0' },
    { name: 'PerplexityBot',  company: 'Perplexity', type: 'busqueda',      product: 'Perplexity',     note: '', token: false, ua: 'PerplexityBot/1.0' },
    { name: 'Googlebot',      company: 'Google',     type: 'busqueda',      product: 'Google Search',  note: '', token: false, ua: 'Googlebot/2.1' },
    { name: 'Google-Extended', company: 'Google',    type: 'entrenamiento', product: 'Bard/Gemini',    note: '', token: true,  ua: 'Google-Extended' },
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
      area: 'Acceso',
      title: `${blockedBots.map(b => b.name).join(', ')} no puede entrar a tu web`,
      detail: `Tu archivo robots.txt le está diciendo a ${blockedBots.map(b => b.name).join(', ')} que no puede visitar tu web. Esto significa que no podrá leer tu contenido ni citarte.`,
      fix: 'Abre tu archivo robots.txt y elimina la línea que bloquea a estos bots.',
    });
  } else {
    good.push('Todos los bots de IA y buscadores pueden entrar a tu web sin restricciones.');
  }

  if (noindex) findings.push({
    level: 'alto',
    area: 'Indexación',
    title: 'Esta página está oculta para los buscadores',
    detail: 'Tienes una etiqueta "noindex" en el código de la página. Esto le dice a Google y a las IAs que ignoren esta página por completo.',
    fix: 'Si quieres que esta página aparezca en búsquedas y sea citada por IAs, elimina esa etiqueta noindex.',
  });

  if (!sitemapData.found) findings.push({
    level: 'medio',
    area: 'Sitemap',
    title: 'Tu web no tiene sitemap',
    detail: 'El sitemap es un archivo que le dice a Google y a las IAs qué páginas existen en tu web. Sin él, pueden perderse contenido importante.',
    fix: 'Crea un sitemap.xml y menciónalo en tu robots.txt para que los bots lo encuentren fácilmente.',
  });
  else good.push('Tu web tiene un sitemap y los bots pueden encontrarlo sin problema.');

  if (!freshness) findings.push({
    level: 'bajo',
    area: 'Fechas',
    title: 'Las IAs no saben cuándo actualizaste tu web',
    detail: 'No hay ninguna fecha visible para los bots en el código de tu página. Sin esto, las IAs no saben si tu contenido es reciente o está desactualizado, lo que puede afectar si te citan.',
    fix: 'Añade las fechas de publicación y última actualización en el código estructurado (JSON-LD) de tu página.',
  });

  if (schemaBlocks === 0 && !microdata) findings.push({
    level: 'medio',
    area: 'Datos estructurados',
    title: 'Tu web no le explica a las IAs de qué trata',
    detail: 'Los datos estructurados son como una ficha técnica que le dice a Google y a las IAs exactamente qué es tu web, de qué habla y quién está detrás. Sin esto, tienen que adivinarlo.',
    fix: 'Añade un bloque JSON-LD en tu página con información básica: nombre, descripción, tipo de negocio y URL.',
  });
  else good.push('Tu web tiene datos estructurados y las IAs pueden entender de qué trata.');

  if (words < 300) findings.push({
    level: 'bajo',
    area: 'Contenido',
    title: 'Hay poco texto en esta página',
    detail: `Esta página tiene unas ${words} palabras. Las IAs necesitan suficiente contenido para entender de qué habla tu web y decidir si citarla.`,
    fix: 'Amplía el contenido de esta página con más información útil para tus visitantes.',
  });
  else good.push(`Esta página tiene buen volumen de contenido (${words} palabras), suficiente para que las IAs la entiendan.`);

  const counts: Record<Level, number> = { alto: 0, medio: 0, bajo: 0, info: 0 };
  for (const f of findings) counts[f.level]++;

  return new Response(JSON.stringify({
    finalUrl, viewAs: UA_BROWSER, ms: Date.now() - start, counts, findings, good, bots,
    page: { schema: { blocks: schemaBlocks, broken: schemaBroken, microdata, types: schemaTypes, entities } },
    sitemap: sitemapData, freshness, samples,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
