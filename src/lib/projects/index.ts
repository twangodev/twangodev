import type { ProjectMetadata } from '$lib/types/project';
import type { Component } from 'svelte';

interface ProjectModule {
	default: Component;
	metadata: Omit<ProjectMetadata, 'slug'>;
}

const modules = import.meta.glob<ProjectModule>('/src/content/projects/*.svx', {
	eager: true
});

function slugFromPath(path: string): string {
	return path.replace('/src/content/projects/', '').replace('.svx', '');
}

export function getAllProjects(): ProjectMetadata[] {
	return Object.entries(modules)
		.map(([path, mod]) => ({
			...mod.metadata,
			slug: slugFromPath(path)
		}))
		.filter((p) => p.published)
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
