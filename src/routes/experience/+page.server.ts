import { getAllExperiences } from '$lib/experience';
import { getAllProjects } from '$lib/projects';
import { extractColorsForEntries } from '$lib/server/extract-color';
import type { TimelineEntry } from '$lib/types/timeline';

export const load = async () => {
	const experiences: TimelineEntry[] = getAllExperiences().map((data) => ({
		kind: 'experience',
		data
	}));
	const projects: TimelineEntry[] = getAllProjects().map((data) => ({
		kind: 'project',
		data
	}));

	const entries = await extractColorsForEntries([...experiences, ...projects]);

	return { entries };
};
