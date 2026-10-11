import type { CollectionEntry } from 'astro:content';
import { BLOG_CATEGORIES } from './consts';

// Posts live at src/content/blog/<category>/<slug>.md and their id is "<category>/<slug>".

// The URL slug: the file name without the folder, so /blog/<slug>/ never depends on the topic.
export const slugOf = (post: CollectionEntry<'blog'>) => post.id.split('/').pop()!;

// A post's topic is the folder it lives in.
// An unknown folder stops the build, so a typo can't publish a post outside every topic.
export function categoryOf(post: CollectionEntry<'blog'>) {
	const parts = post.id.split('/');
	const folder = parts.length > 1 ? parts[parts.length - 2] : '';
	const topic = BLOG_CATEGORIES.find((c) => c.slug === folder);
	if (!topic) {
		const valid = BLOG_CATEGORIES.map((c) => c.slug).join(', ');
		throw new Error(
			`Blog post "src/content/blog/${post.id}.md" is not inside a topic folder. Move it into one of: ${valid}.`,
		);
	}
	return topic;
}

// Two posts with the same file name in different folders would share a URL. Stop the build instead.
export function assertUniqueSlugs(posts: CollectionEntry<'blog'>[]) {
	const seen = new Map<string, string>();
	for (const p of posts) {
		const slug = slugOf(p);
		const other = seen.get(slug);
		if (other) throw new Error(`Two blog posts would share /blog/${slug}/: "${other}" and "${p.id}". Rename one of the files.`);
		seen.set(slug, p.id);
	}
}
