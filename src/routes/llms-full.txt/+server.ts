import { site } from '$lib/config';
import { getAllPosts } from '$lib/writing';
import { getRawPostSource } from '$lib/writing/raw';
import { getRenderers } from '$lib/writing/renderers';
import { toMarkdown } from '$lib/writing/markdown';
import type { RequestHandler } from './$types';

export const prerender = true;

// The whole writing corpus as clean Markdown, one document. `getAllPosts` is
// published-only at build time, matching the feeds and sitemap.
export const GET: RequestHandler = () => {
	const renderers = getRenderers();

	const documents = getAllPosts()
		.map((post) => {
			const source = getRawPostSource(post.slug);
			if (source === undefined) return undefined;
			const markdown = toMarkdown(source, { metadata: post, renderers });
			return `${markdown}\nSource: ${site.url}/writing/${post.slug}\n`;
		})
		.filter((doc): doc is string => doc !== undefined);

	const header = `# ${site.name} — Writing\n\n> ${site.description}\n\nThe full text of every post, in Markdown. Individual posts: ${site.url}/writing/<slug>.md · Index: ${site.url}/llms.txt\n`;

	const body = [header, ...documents].join('\n---\n\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
