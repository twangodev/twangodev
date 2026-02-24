import { getAllExperiences } from '$lib/experience';

export const load = () => {
	return {
		experiences: getAllExperiences()
	};
};
