// @ts-check

import { readdirSync, readFileSync } from 'node:fs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig, fontProviders } from 'astro/config';
import { FRAMEWORK_PUBLISHED } from './src/consts.ts';

const SITE = 'https://www.aeogrowth.co/';

// ---------- sitemap <lastmod> ----------
// Blog posts: updatedDate if set, otherwise pubDate (read from each post's frontmatter).
// /blog/: date of the newest post. /framework/: FRAMEWORK_PUBLISHED in src/consts.ts.
// Every other page: the build date.
const BLOG_DIR = new URL('./src/content/blog/', import.meta.url);

/** @param {string} frontmatter @param {string} key */
function frontmatterDate(frontmatter, key) {
	const m = frontmatter.match(new RegExp(`^${key}:\\s*['"]?([^'"\\n]+)['"]?\\s*$`, 'm'));
	if (!m) return null;
	const d = new Date(m[1].trim());
	return isNaN(d.getTime()) ? null : d;
}

/** @type {Map<string, Date>} */
const postDates = new Map();
for (const file of readdirSync(BLOG_DIR)) {
	if (!/\.(md|mdx)$/.test(file)) continue;
	const text = readFileSync(new URL(file, BLOG_DIR), 'utf8');
	const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	const date = frontmatterDate(fm, 'updatedDate') ?? frontmatterDate(fm, 'pubDate');
	if (date) postDates.set(file.replace(/\.(md|mdx)$/, ''), date);
}
const newestPost = [...postDates.values()].sort((a, b) => b.getTime() - a.getTime())[0];
const buildDate = new Date();

/** @param {string} url */
function lastmodFor(url) {
	const path = new URL(url).pathname.replace(/\/$/, '');
	const post = path.match(/^\/blog\/(.+)$/);
	if (post && postDates.has(post[1])) return postDates.get(post[1]);
	if (path === '/blog' && newestPost) return newestPost;
	if (path === '/framework') return new Date(`${FRAMEWORK_PUBLISHED}T12:00:00Z`);
	return buildDate;
}

export default defineConfig({
	site: SITE,
	output: 'server',
	adapter: vercel({ maxDuration: 60 }),
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				item.lastmod = lastmodFor(item.url)?.toISOString();
				return item;
			},
		}),
	],
	// 301 redirects for blog slugs that changed. Add one line per renamed post:
	// '/blog/old-slug': { status: 301, destination: '/blog/new-slug/' },
	redirects: {
		'/blog/aeo-vs-seo-blog': { status: 301, destination: '/blog/aeo-vs-seo/' },
		'/blog/aeo-vs-geo-blog': { status: 301, destination: '/blog/aeo-vs-geo/' },
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
