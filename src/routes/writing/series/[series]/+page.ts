import { getPostsBySeries, getAllSeries } from '$lib/writing';

export const load = ({ params }) => {
	return {
		bioExpanded: true,
		series: params.series,
		posts: getPostsBySeries(params.series)
	};
};

export const entries = () => {
	return getAllSeries().map(({ name }) => ({ series: name }));
};
