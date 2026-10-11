// NOTE: this file is also imported by astro.config.mjs (sitemap lastmod).
// Keep it plain data — no image or component imports.

// Brand name shown in the header, footer copyright and RSS feed.
export const SITE_TITLE = 'AEO Growth';
export const SITE_URL = 'https://www.aeogrowth.co';

export const AUTHOR_NAME = 'Gerald De Oleo';
export const JOB_TITLE = 'AEO consultant';

// Prices. Change them here and they update on the home page, /services, the schema and llms.txt.
export const AUDIT_PRICE = '$1,000';
export const AUDIT_PRICE_VALUE = 1000;
export const MONTHLY_PRICE = '$2,500';
export const MONTHLY_PRICE_VALUE = 2500;

// <title> of the home page (other pages use "<Page> — AUTHOR_NAME").
export const HOME_TITLE = `${AUTHOR_NAME} — AEO consultant for B2B SaaS`;
export const SITE_DESCRIPTION = `${AUTHOR_NAME}, independent AEO & GEO consultant for B2B SaaS. Get found, cited, and described correctly in AI answers. ${AUDIT_PRICE} audit, ${MONTHLY_PRICE} per month.`;

// Meta description of /services (also used as the Service schema description).
export const SERVICES_DESCRIPTION = `Answer engine optimization and GEO for B2B SaaS. Diagnosis, corrections, and monthly measurement of what AI engines say about your company. ${AUDIT_PRICE} audit, ${MONTHLY_PRICE} per month.`;

// What the business does, in /services wording only. Used in the ProfessionalService schema and llms.txt.
export const BUSINESS_DESCRIPTION =
	"Answer engine optimization and GEO for B2B SaaS. An audit of what ChatGPT, Perplexity, Gemini and Google's AI results say about your company and where that information comes from; the fixes — crawler access, schema markup, listing corrections and buyer-intent pages; and monthly measurement of what the engines say.";

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
