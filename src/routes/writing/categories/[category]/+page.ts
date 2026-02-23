import { getPostsByCategory, getAllCategories } from '$lib/writing';

export const load = ({ params }) => {
	return {
		bioExpanded: true,
		category: params.category,
		posts: getPostsByCategory(params.category)
	};
};

export const entries = () => {
	return getAllCategories().map(({ name }) => ({ category: name }));
};
