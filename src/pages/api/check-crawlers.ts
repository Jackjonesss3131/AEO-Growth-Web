import type { APIRoute } from 'astro';
import { runCrawlerCheck } from '../../lib/crawler-check.ts';

// HTTP wrapper only. The check itself lives in src/lib/crawler-check.ts, shared with
// scripts/batch-audit.js.
export const prerender = false;

const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900', ...extra },
  });

export const GET: APIRoute = async ({ request }) => {
  const raw = new URL(request.url).searchParams.get('url');
  const key = raw ?? '';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return json(hit.body, 200, { 'X-Cache': 'HIT' });

  try {
    const { status, data } = await runCrawlerCheck(raw);
    if (status !== 200) return json(data, status);
    const body = JSON.stringify(data);
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return json(body, 200, { 'X-Cache': 'MISS' });
  } catch (err) {
    console.error('[check-crawlers] failed for', raw, err);
    return json({ error: 'Something failed on our side. Try again in a minute.' }, 500);
  }
};
