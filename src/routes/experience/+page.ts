import { getAllExperiences } from '$lib/experience';
import { getAllProjects } from '$lib/projects';
import type { TimelineEntry } from '$lib/types/timeline';

export const load = () => {
	const experiences: TimelineEntry[] = getAllExperiences().map((data) => ({
		kind: 'experience',
		data
	}));
	const projects: TimelineEntry[] = getAllProjects().map((data) => ({
		kind: 'project',
		data
	}));
	return {
		entries: [...experiences, ...projects]
	};
};
