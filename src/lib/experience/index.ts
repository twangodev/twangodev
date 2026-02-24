import type { ExperienceMetadata } from '$lib/types/experience';
import type { Component } from 'svelte';

interface ExperienceModule {
	default: Component;
	metadata: Omit<ExperienceMetadata, 'slug'>;
}

const modules = import.meta.glob<ExperienceModule>('/src/content/experience/*.svx', {
	eager: true
});

function slugFromPath(path: string): string {
	return path.replace('/src/content/experience/', '').replace('.svx', '');
}

export function getAllExperiences(): ExperienceMetadata[] {
	return Object.entries(modules)
		.map(([path, mod]) => ({
			...mod.metadata,
			slug: slugFromPath(path)
		}))
		.filter((exp) => exp.published)
		.sort((a, b) => {
			const aOngoing = !a.dateEnd;
			const bOngoing = !b.dateEnd;

			if (aOngoing && !bOngoing) return -1;
			if (!aOngoing && bOngoing) return 1;

			if (aOngoing && bOngoing) {
				return new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime();
			}

			return new Date(b.dateEnd!).getTime() - new Date(a.dateEnd!).getTime();
		});
}

export function getExperienceBySlug(
	slug: string
): { metadata: ExperienceMetadata; component: Component } | undefined {
	const entry = Object.entries(modules).find(([path]) => slugFromPath(path) === slug);
	if (!entry) return undefined;
	const [path, mod] = entry;
	if (!mod.metadata.published) return undefined;
	return {
		metadata: { ...mod.metadata, slug: slugFromPath(path) },
		component: mod.default
	};
}
