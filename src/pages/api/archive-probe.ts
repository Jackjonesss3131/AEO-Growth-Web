import type { APIRoute } from 'astro';

// TEMPORARY diagnostic: measures Internet Archive responses from the Vercel function. Remove after use.
export const prerender = false;

async function hit(url: string, ms = 15000) {
	const t = Date.now();
	try {
		const r = await fetch(url, {
			signal: AbortSignal.timeout(ms),
			redirect: 'follow',
			headers: { 'User-Agent': 'AEOGrowthPositioningCheck/1.0 (+https://www.aeogrowth.co/positioning-check)', Accept: '*/*' },
		});
		const text = await r.text();
		return { status: r.status, ms: Date.now() - t, bytes: text.length, finalUrl: r.url, head: text.slice(0, 220) };
	} catch (e) {
		return { error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), ms: Date.now() - t };
	}
}

export const GET: APIRoute = async ({ url }) => {
	const host = url.searchParams.get('host') || 'stripe.com';
	const d = new Date();
	d.setMonth(d.getMonth() - 12);
	const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
	const ts = '20251001000000';
	const [available, cdx, page, pageNoTs] = await Promise.all([
		hit(`https://archive.org/wayback/available?url=${encodeURIComponent(host)}&timestamp=${stamp}`, 9000),
		hit(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(host)}&from=${stamp.slice(0, 6)}&to=${stamp.slice(0, 6)}&filter=statuscode:200&fl=timestamp&limit=2&output=json`, 9000),
		hit(`https://web.archive.org/web/${ts}id_/https://${host}/`, 9000),
		hit(`https://web.archive.org/web/${stamp}/https://${host}/`, 9000),
	]);
	return new Response(JSON.stringify({ host, stamp, ts, available, cdx, page, pageNoTs }, null, 2), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
};
