import type { APIRoute } from 'astro';
import { runPositioningCheck } from '../../lib/positioning-check.ts';

// HTTP wrapper only. The check itself lives in src/lib/positioning-check.ts, shared with
// scripts/batch-audit.js.
export const prerender = false;

function respond(data: unknown, status = 200, cacheable = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheable ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const domain = url.searchParams.get('domain');
  try {
    const { status, data, complete } = await runPositioningCheck(domain);
    return respond(data, status, status === 200 && complete);
  } catch (err) {
    console.error('[positioning] failed for', domain, err);
    return respond({ error: 'Something failed on our side. Try again in a minute.' }, 500);
  }
};
