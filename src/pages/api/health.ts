import type { APIRoute } from 'astro';
import { GET as positioning } from './positioning';
import { GET as checkCrawlers } from './check-crawlers';

// TEMPORARY diagnostic endpoint. Runs both tools in-process and reports what happens.
// Remove once the production failure is understood.
export const prerender = false;

async function probe(url: string) {
	const t = Date.now();
	try {
		const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'AEOGrowthHealth/1.0' } });
		const body = await r.text();
		return { url, status: r.status, ms: Date.now() - t, bytes: body.length };
	} catch (e) {
		return { url, error: e instanceof Error ? `${e.name}: ${e.message} ${(e as any).cause ?? ''}` : String(e), ms: Date.now() - t };
	}
}

async function runTool(name: string, fn: APIRoute, url: URL) {
	const t = Date.now();
	try {
		const ctx = { url, request: new Request(url) } as any;
		const r = await fn(ctx);
		const text = await r.text();
		return { name, status: r.status, type: r.headers.get('content-type'), ms: Date.now() - t, body: text.slice(0, 400) };
	} catch (e) {
		return { name, threw: e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : String(e), ms: Date.now() - t };
	}
}

export const GET: APIRoute = async ({ url }) => {
	const out: Record<string, unknown> = {
		node: process.version,
		region: process.env.VERCEL_REGION ?? null,
		memoryMB: Math.round(process.memoryUsage().rss / 1e6),
	};
	const mode = url.searchParams.get('mode');
	if (mode === 'net') {
		out.net = await Promise.all([
			probe('https://example.com/'),
			probe('https://archive.org/wayback/available?url=example.com'),
			probe('https://index.commoncrawl.org/collinfo.json'),
			probe('https://query.wikidata.org/sparql?format=json&query=SELECT%20%3Fx%20WHERE%20%7B%7D%20LIMIT%201'),
		]);
	}
	if (mode === 'crawlers') {
		out.tool = await runTool('check-crawlers', checkCrawlers, new URL('https://www.aeogrowth.co/api/check-crawlers?url=example.com'));
	}
	if (mode === 'positioning') {
		out.tool = await runTool('positioning', positioning, new URL('https://www.aeogrowth.co/api/positioning?domain=example.com'));
	}
	return new Response(JSON.stringify(out, null, 2), {
		status: 200,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
};
