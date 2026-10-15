// NOTE: this file is also imported by astro.config.mjs (sitemap lastmod).
// Keep it plain data — no image or component imports.

// Brand name shown in the header, footer copyright and RSS feed.
export const SITE_TITLE = 'AEO Growth';
export const SITE_URL = 'https://www.aeogrowth.co';

export const AUTHOR_NAME = 'Gerald De Oleo';
export const JOB_TITLE = 'AEO consultant';

// Prices. Change them here and they update everywhere: home, /services, schema, llms.txt,
// and any blog post that writes {AUDIT_PRICE} or {MONTHLY_PRICE} (replaced at build time).
export const AUDIT_PRICE = '$499';
export const AUDIT_PRICE_VALUE = 499;
export const MONTHLY_PRICE = '$2,500';
export const MONTHLY_PRICE_VALUE = 2500;

// Free pre-call review. Deliberately small and named, so it is never confused with the paid audit.
export const FREE_CHECK_NAME = 'Shortlist Check';
export const FREE_CHECK_SCOPE = "three or four of your buyers' questions in one engine, to see whether you appear and how you're described";
export const AUDIT_SCOPE = 'every question across ChatGPT, Perplexity, Gemini and Google, the sources behind each answer, and the fix list';

// <title> of the home page (other pages use "<Page> — AUTHOR_NAME").
export const HOME_TITLE = `${AUTHOR_NAME} — AEO consultant for B2B SaaS`;
export const SITE_DESCRIPTION = `${AUTHOR_NAME}, independent AEO & GEO consultant for B2B SaaS. Get found, cited, and described correctly in AI answers. ${AUDIT_PRICE} audit, ${MONTHLY_PRICE} per month.`;

// Meta description of /services (also used as the Service schema description).
export const SERVICES_DESCRIPTION = `Answer engine optimization and GEO for B2B SaaS. Diagnosis, corrections, and monthly measurement of what AI engines say about your company. ${AUDIT_PRICE} audit, ${MONTHLY_PRICE} per month.`;

// What the business does, in /services wording only. Used in the ProfessionalService schema and llms.txt.
export const BUSINESS_DESCRIPTION =
	"Answer engine optimization and GEO for B2B SaaS. An audit of what ChatGPT, Perplexity, Gemini and Google's AI results say about your company and where that information comes from; the fixes — crawler access, schema markup, listing corrections and buyer-intent pages; and monthly measurement of what the engines say.";

// /audit: the dedicated audit page. Title is exact (not suffixed like other pages),
// because it is the one page meant to rank on the price itself.
export const AUDIT_TITLE = `AEO Audit for B2B SaaS — ${AUDIT_PRICE} | ${AUTHOR_NAME}`;
export const AUDIT_DESCRIPTION = `A one-time ${AUDIT_PRICE} AEO audit for B2B SaaS: 25 buyer questions across ChatGPT, Perplexity, Gemini and Google's AI results, 3 named competitors, every cited source mapped, and a prioritized fix list. Delivered in five business days.`;

// Meta description of /about (also used as the ProfilePage schema description).
export const ABOUT_DESCRIPTION = `${AUTHOR_NAME} — AEO and GEO for B2B SaaS. Independent consultant, previously product-led growth.`;

export const CALENDLY_URL = 'https://calendly.com/geraldeoleo/growth-plg';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/gerald-de-oleo-589240442/';

// The four framework layers. Single source of truth for the home page, /services and /framework.
export const FRAMEWORK_LAYERS = [
	{ n: 1, name: 'Retrieval', question: 'Can the engine reach and read your pages at all?' },
	{ n: 2, name: 'Citation', question: 'Does the engine use your content as a source?' },
	{ n: 3, name: 'Interpretation', question: 'Does the engine understand what your content says?' },
	{ n: 4, name: 'Expression', question: 'How does the engine describe you in the final answer?' },
] as const;

// /framework: title, description (meta + Article schema) and visible date.
export const FRAMEWORK_TITLE = 'The four layers of AI answer failure';
export const FRAMEWORK_DESCRIPTION =
	'Retrieval, citation, interpretation, expression. A framework for diagnosing why a company is missing or misdescribed in AI-generated answers, and what each layer takes to fix.';
export const FRAMEWORK_PUBLISHED = '2026-10-09';

// Blog topics, in the order they appear on /blog. Each post sets `category:` to one of these slugs.
export const BLOG_CATEGORIES = [
	{
		slug: 'basics',
		name: 'AEO basics',
		blurb: 'What answer engine optimization is, how it differs from SEO and GEO, and how AI engines decide which companies to name.',
	},
	{
		slug: 'getting-recommended',
		name: 'Getting cited and recommended',
		blurb: 'The work itself: what to fix first, what to publish, and which sources actually move the answer.',
	},
	{
		slug: 'measurement',
		name: 'Measuring it',
		blurb: 'Audits, visibility tools, AI traffic in GA4, and how long any of this takes to show up.',
	},
	{
		slug: 'hiring',
		name: 'Hiring help',
		blurb: 'Agency, specialist or in-house: real prices, the questions to ask, and the red flags.',
	},
	{
		slug: 'by-category',
		name: 'By software category',
		blurb: 'Why AI keeps recommending the competitor in specific SaaS markets, and what to fix first.',
	},
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]['slug'];

// Suggested first reads, shown at the top of /blog.
export const BLOG_START_HERE = ['aeo-vs-seo', 'how-to-get-ai-recommendations', 'how-to-appear-in-chatgpt-answers'];
