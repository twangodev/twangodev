import { error } from '@sveltejs/kit';
import { getAllPosts, getPostBySlug } from '$lib/writing';
import { getRawPostSource } from '$lib/writing/raw';
import { getRenderers } from '$lib/writing/renderers';
import { toMarkdown } from '$lib/writing/markdown';
import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

// The prerender crawler only follows <a>, not <link>, so list .md URLs explicitly.
export const entries: EntryGenerator = () => getAllPosts().map((post) => ({ slug: post.slug }));

export const GET: RequestHandler = ({ params }) => {
	const post = getPostBySlug(params.slug);
	const source = getRawPostSource(params.slug);
	if (!post || source === undefined) error(404, 'Not found');

	const markdown = toMarkdown(source, { metadata: post.metadata, renderers: getRenderers() });

	return new Response(markdown, {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
	});
};
