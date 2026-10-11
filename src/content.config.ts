import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Posts live in one folder per topic: src/content/blog/<category>/<slug>.md
	// The folder sets the topic and the file name sets the URL (/blog/<slug>/); see src/blog.ts.
	// The entry id keeps the folder ("measurement/my-post") so that moving a post to another
	// folder is a new entry and never reuses cached data with the old topic. The URL ignores
	// the folder, so moving a post never changes its URL. README.md files and files starting
	// with "_" are instructions/templates, not posts.
	loader: glob({
		base: './src/content/blog',
		pattern: ['**/*.{md,mdx}', '!**/README.md', '!**/_*'],
		generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
	}),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// Social preview image (og:image / twitter:image). Path relative to the post,
			// e.g. ogImage: '../../../assets/og/my-post.jpg' (1200x630 recommended).
			// Falls back to heroImage, then to the site default set in BaseHead.astro.
			ogImage: z.optional(image()),
		}),
});

export const collections = { blog };
