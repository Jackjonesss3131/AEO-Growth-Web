import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { BLOG_CATEGORIES } from './consts';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			// Topic used to group posts on /blog. Must be one of BLOG_CATEGORIES in src/consts.ts.
			category: z.enum(BLOG_CATEGORIES.map((c) => c.slug) as [string, ...string[]]),
			heroImage: z.optional(image()),
			// Social preview image (og:image / twitter:image). Path relative to the post,
			// e.g. ogImage: '../../assets/og/my-post.jpg' (1200x630 recommended).
			// Falls back to heroImage, then to the site default set in BaseHead.astro.
			ogImage: z.optional(image()),
		}),
});

export const collections = { blog };
