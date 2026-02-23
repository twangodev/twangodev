import { getAllPosts, getAllTags, getAllCategories, getAllSeries } from '$lib/writing';

export const load = () => {
	return {
		bioExpanded: true,
		posts: getAllPosts(),
		tags: getAllTags(),
		categories: getAllCategories(),
		series: getAllSeries()
	};
};
