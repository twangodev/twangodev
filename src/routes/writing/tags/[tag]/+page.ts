import { getPostsByTag, getAllTags } from '$lib/writing';

export const load = ({ params }) => {
	return {
		bioExpanded: true,
		tag: params.tag,
		posts: getPostsByTag(params.tag)
	};
};

export const entries = () => {
	return getAllTags().map(({ name }) => ({ tag: name }));
};
