import { error } from '@sveltejs/kit';
import { getPostBySlug, getPostsBySeries, getAllPosts } from '$lib/writing';

export const load = ({ params }) => {
	const post = getPostBySlug(params.slug);
	if (!post) error(404, 'Post not found');

	const seriesPosts = post.metadata.series ? getPostsBySeries(post.metadata.series.name) : [];

	return {
		bioExpanded: true,
		metadata: post.metadata,
		component: post.component,
		seriesPosts
	};
};

export const entries = () => {
	return getAllPosts().map((post) => ({ slug: post.slug }));
};
