// Vercel serverless function — /api/check?url=example.com
// Vercel picks this up automatically from the /api folder, no Astro config needed.

const BOTS = [
	'GPTBot',
	'OAI-SearchBot',
	'ChatGPT-User',
	'ClaudeBot',
	'PerplexityBot',
	'Google-Extended',
	'Applebot-Extended',
	'CCBot',
];

const UA = 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)';
const HUMAN_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const TIMEOUT = 12000;

async function get(url, ua = UA) {
	try {
		const r = await fetch(url, {
			headers: { 'user-agent': ua, accept: '*/*' },
			redirect: 'follow',
			signal: AbortSignal.timeout(TIMEOUT),
		});
		return { ok: r.ok, status: r.status, headers: r.headers, body: await r.text() };
	} catch (e) {
		return { err: e.message };
	}
}

function parseRobots(txt) {
	const groups = [];
	let cur = null;
	for (let line of txt.split('\n')) {
		line = line.replace(/#.*$/, '').trim();
		if (!line) continue;
		const i = line.indexOf(':');
		if (i < 0) continue;
		const key = line.slice(0, i).trim().toLowerCase();
		const val = line.slice(i + 1).trim();
		if (key === 'user-agent') {
			if (!cur || cur.rules.length) {
				cur = { agents: [], rules: [] };
				groups.push(cur);
			}
			cur.agents.push(val.toLowerCase());
		} else if (cur && (key === 'allow' || key === 'disallow')) {
			cur.rules.push({ allow: key === 'allow', path: val });
		}
	}
	return groups;
}

function botVerdict(groups, bot) {
	const name = bot.toLowerCase();
	let g = groups.find((x) => x.agents.includes(name));
	let src = 'specific rule';
	if (!g) {
		g = groups.find((x) => x.agents.includes('*'));
		src = 'wildcard';
	}
	if (!g) return { state: 'allowed', note: 'no rules' };

	const blockAll = g.rules.some((r) => !r.allow && r.path === '/');
	if (blockAll) {
		const allowsSome = g.rules.some((r) => r.allow && r.path && r.path !== '/');
		return {
			state: 'blocked',
			note: allowsSome ? `all but exceptions (${src})` : `Disallow: / (${src})`,
		};
	}
	const partial = g.rules.filter((r) => !r.allow && r.path && r.path !== '/');
	if (partial.length) return { state: 'partial', note: `${partial.length} paths blocked (${src})` };
	return { state: 'allowed', note: src };
}

function visibleWords(html) {
	const clean = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z]+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return clean ? clean.split(' ').length : 0;
}

function checkSchema(html) {
	const blocks = [
		...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
	];
	if (!blocks.length) return { state: 'fail', note: 'No structured data found' };
	const types = [];
	let broken = 0;
	for (const b of blocks) {
		try {
			const data = JSON.parse(b[1].trim());
			for (const n of [].concat(data['@graph'] || data)) {
				if (n && n['@type']) types.push(...[].concat(n['@type']));
			}
		} catch {
			broken++;
		}
	}
	if (broken) return { state: 'fail', note: `${broken} of ${blocks.length} blocks don't parse` };
	const hasOrg = types.some((t) => /Organization|Corporation|LocalBusiness|ProfessionalService/i.test(t));
	return {
		state: hasOrg ? 'pass' : 'warn',
		note: types.length ? types.join(', ') : 'empty',
	};
}

function checkHeaders(headers, html) {
	const found = [];
	const xr = headers?.get?.('x-robots-tag');
	if (xr) found.push(`X-Robots-Tag: ${xr}`);
	const meta = [
		...html.matchAll(/<meta[^>]+name=["']([^"']*robots[^"']*)["'][^>]*content=["']([^"']+)["']/gi),
	];
	for (const m of meta) {
		if (/noindex|nofollow|noai|noimageai/i.test(m[2])) found.push(`${m[1]}: ${m[2]}`);
	}
	return found.length
		? { state: 'warn', note: found.join(' · ') }
		: { state: 'pass', note: 'Nothing blocking indexing' };
}

export default async function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Cache-Control', 's-maxage=600');

	const raw = (req.query?.url || '').toString().trim();
	if (!raw) return res.status(400).json({ error: 'Missing url' });

	let base;
	try {
		base = new URL(raw.startsWith('http') ? raw : 'https://' + raw).origin;
	} catch {
		return res.status(400).json({ error: "That doesn't look like a valid domain." });
	}

	const checks = [];

	// 1 — can a bot fetch the homepage at all
	const asBot = await get(base);
	if (asBot.err) {
		return res.status(200).json({
			base,
			unreachable: true,
			error: asBot.err,
		});
	}
	const asHuman = await get(base, HUMAN_UA);

	let accessState = 'pass';
	let accessNote = `Server returned ${asBot.status} to an AI crawler.`;
	if (asBot.status === 403 || asBot.status === 401) {
		accessState = 'fail';
		accessNote =
			asHuman.ok && asHuman.status === 200
				? `Blocked. Your server returns ${asBot.status} to AI crawlers but 200 to a browser. Something at your CDN or firewall is refusing them.`
				: `Server returns ${asBot.status} to AI crawlers.`;
	} else if (asBot.status === 429) {
		accessState = 'fail';
		accessNote = 'Rate limited (429). Crawlers are being throttled.';
	} else if (!asBot.ok) {
		accessState = 'warn';
		accessNote = `Server returned ${asBot.status}.`;
	}
	checks.push({ id: 'access', label: 'Crawler access', state: accessState, note: accessNote });

	// 2 — javascript dependency
	const words = visibleWords(asBot.body);
	const kb = Math.round(asBot.body.length / 1024);
	let jsState = 'pass';
	let jsNote = `${words} words readable without JavaScript.`;
	if (words < 50) {
		jsState = 'fail';
		jsNote = `Only ${words} words in ${kb}KB of HTML. Most AI crawlers don't run JavaScript, so they're seeing an almost empty page.`;
	} else if (words < 200) {
		jsState = 'warn';
		jsNote = `${words} words in ${kb}KB. Thin for a homepage — check whether key content loads client-side.`;
	}
	checks.push({ id: 'js', label: 'Readable without JavaScript', state: jsState, note: jsNote });

	// 3 — robots.txt, per bot
	const rb = await get(base + '/robots.txt');
	let bots = [];
	let robotsState = 'pass';
	let robotsNote = '';
	let sitemaps = [];

	if (rb.err || !rb.ok || /^\s*</.test(rb.body || '')) {
		robotsState = 'warn';
		robotsNote =
			rb.status === 404 || rb.err
				? 'No robots.txt found. Everything is allowed by default, but you have no explicit control.'
				: `robots.txt returned ${rb.status}.`;
	} else {
		const groups = parseRobots(rb.body);
		bots = BOTS.map((b) => ({ name: b, ...botVerdict(groups, b) }));
		sitemaps = [...rb.body.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
		const blocked = bots.filter((b) => b.state === 'blocked');
		const partial = bots.filter((b) => b.state === 'partial');
		if (blocked.length) {
			robotsState = 'fail';
			robotsNote = `${blocked.length} AI crawler${blocked.length > 1 ? 's are' : ' is'} blocked in robots.txt: ${blocked
				.map((b) => b.name)
				.join(', ')}.`;
		} else if (partial.length) {
			robotsState = 'warn';
			robotsNote = `All AI crawlers allowed, with path restrictions on ${partial.length}.`;
		} else {
			robotsNote = 'All major AI crawlers are allowed.';
		}
	}
	checks.push({ id: 'robots', label: 'robots.txt', state: robotsState, note: robotsNote, bots });

	// 4 — structured data
	const sc = checkSchema(asBot.body);
	checks.push({
		id: 'schema',
		label: 'Structured data',
		state: sc.state,
		note:
			sc.state === 'pass'
				? `Found: ${sc.note}`
				: sc.state === 'warn'
					? `Found ${sc.note}, but no Organization type. Models use it to resolve who you are.`
					: sc.note,
	});

	// 5 — blocking headers / meta
	const hd = checkHeaders(asBot.headers, asBot.body);
	checks.push({ id: 'headers', label: 'Headers and meta tags', state: hd.state, note: hd.note });

	// 6 — sitemap
	const smUrls = sitemaps.length ? sitemaps : [base + '/sitemap-index.xml', base + '/sitemap.xml'];
	let sm = { state: 'warn', note: 'No sitemap found at the usual paths.' };
	for (const u of smUrls) {
		const r = await get(u);
		if (r.err || !r.ok) continue;
		const n = (r.body.match(/<loc>/g) || []).length;
		sm = n
			? { state: 'pass', note: `${n} URLs listed.` }
			: { state: 'warn', note: 'Sitemap found but empty.' };
		break;
	}
	checks.push({ id: 'sitemap', label: 'Sitemap', state: sm.state, note: sm.note });

	const fails = checks.filter((c) => c.state === 'fail').length;
	const warns = checks.filter((c) => c.state === 'warn').length;

	return res.status(200).json({
		base,
		checkedAt: new Date().toISOString(),
		summary: { fails, warns, total: checks.length },
		checks,
	});
}
