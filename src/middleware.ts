import { defineMiddleware } from 'astro:middleware';
import { AUDIT_PRICE, MONTHLY_PRICE } from './consts';

// Blog posts write {AUDIT_PRICE} / {MONTHLY_PRICE} instead of typing a price by hand.
// This swaps them for the values in src/consts.ts when each page is rendered (at build time
// for prerendered pages), so prices live in exactly one place.
const TOKENS: [string, string][] = [
	['{AUDIT_PRICE}', AUDIT_PRICE],
	['{MONTHLY_PRICE}', MONTHLY_PRICE],
];

export const onRequest = defineMiddleware(async (_context, next) => {
	const response = await next();
	if (!(response.headers.get('content-type') || '').includes('text/html')) return response;
	const html = await response.text();
	if (!html.includes('{AUDIT_PRICE}') && !html.includes('{MONTHLY_PRICE}')) {
		return new Response(html, { status: response.status, headers: response.headers });
	}
	let out = html;
	for (const [token, value] of TOKENS) out = out.split(token).join(value);
	return new Response(out, { status: response.status, headers: response.headers });
});
