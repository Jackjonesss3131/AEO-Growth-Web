import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
	AUTHOR_NAME,
	JOB_TITLE,
	SITE_URL,
	SITE_DESCRIPTION,
	BUSINESS_DESCRIPTION,
	SERVICES_DESCRIPTION,
	ABOUT_DESCRIPTION,
	AUDIT_PRICE,
	MONTHLY_PRICE,
	FRAMEWORK_LAYERS,
	FRAMEWORK_TITLE,
	FRAMEWORK_DESCRIPTION,
	CALENDLY_URL,
	LINKEDIN_URL,
	BLOG_CATEGORIES,
	FREE_CHECK_NAME,
	FREE_CHECK_SCOPE,
} from '../consts';

// /llms.txt (https://llmstxt.org). Built from the same constants and posts as the site,
// so it always says the same thing as the title, meta description, schema and pages.
export const prerender = true;

export const GET: APIRoute = async () => {
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	const lines = [
		`# ${AUTHOR_NAME}`,
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		`${AUTHOR_NAME} is an independent ${JOB_TITLE} for B2B SaaS — one person, not an agency. The site is published at ${SITE_URL} under the name AEO Growth.`,
		'',
		BUSINESS_DESCRIPTION,
		'',
		`Pricing: the audit is ${AUDIT_PRICE}, one time. Ongoing work is ${MONTHLY_PRICE} per month, no contract.`,
		'',
		`Before a first call: a free ${FREE_CHECK_NAME} — ${FREE_CHECK_SCOPE}. It is not the audit.`,
		'',
		`Framework — ${FRAMEWORK_TITLE}:`,
		...FRAMEWORK_LAYERS.map((l) => `${l.n}. ${l.name}: ${l.question}`),
		'',
		'## Pages',
		'',
		`- [Home](${SITE_URL}/): ${SITE_DESCRIPTION}`,
		`- [Services](${SITE_URL}/services): ${SERVICES_DESCRIPTION}`,
		`- [Framework](${SITE_URL}/framework): ${FRAMEWORK_DESCRIPTION}`,
		`- [About](${SITE_URL}/about): ${ABOUT_DESCRIPTION}`,
		`- [Crawler Check](${SITE_URL}/ai-crawler-check/): Free tool. Check if ChatGPT, Claude, Perplexity and Google can read your site, and what they find when they crawl it.`,
		`- [Positioning Check](${SITE_URL}/positioning-check/): Free tool. See how your homepage described your company over time, and which version AI training data most likely captured.`,
		'',
		...BLOG_CATEGORIES.flatMap((c) => {
			const inTopic = posts.filter((p) => p.data.category === c.slug);
			if (!inTopic.length) return [];
			return [
				`## Blog: ${c.name}`,
				'',
				c.blurb,
				'',
				...inTopic.map((p) => `- [${p.data.title}](${SITE_URL}/blog/${p.id}/): ${p.data.description}`),
				'',
			];
		}),
		'## Contact',
		'',
		`- [Book a call](${CALENDLY_URL})`,
		`- [LinkedIn](${LINKEDIN_URL})`,
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
