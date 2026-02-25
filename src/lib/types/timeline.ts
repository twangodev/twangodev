import type { ExperienceMetadata } from './experience';
import type { ProjectMetadata } from './project';

export type TimelineEntry =
	| { kind: 'experience'; data: ExperienceMetadata }
	| { kind: 'project'; data: ProjectMetadata };

export function entrySlug(e: TimelineEntry): string {
	return e.data.slug;
}

export function entryDateStart(e: TimelineEntry): Date {
	return new Date(e.data.dateStart);
}

export function entryDateEnd(e: TimelineEntry): Date | null {
	return e.data.dateEnd ? new Date(e.data.dateEnd) : null;
}

export function entryBase(e: TimelineEntry): string {
	return e.kind === 'project' ? e.data.base : 'main';
}

export function entryColor(e: TimelineEntry): string | undefined {
	return e.data.color;
}

export function entryLabel(e: TimelineEntry): string {
	return e.kind === 'experience' ? e.data.company : e.data.name;
}

export function entryCommits(e: TimelineEntry): string[] {
	return e.data.commits;
}

export function entryTags(e: TimelineEntry): string[] {
	return e.data.tags;
}

export function entryLogo(e: TimelineEntry): string | undefined {
	return e.data.logo;
}

export function entrySubtitle(e: TimelineEntry): string | undefined {
	return e.kind === 'experience' ? e.data.role : e.data.description;
}

export function sortEntries(entries: TimelineEntry[]): TimelineEntry[] {
	return [...entries].sort((a, b) => {
		const aEnd = entryDateEnd(a);
		const bEnd = entryDateEnd(b);
		const aOngoing = aEnd === null;
		const bOngoing = bEnd === null;

		if (aOngoing && !bOngoing) return -1;
		if (!aOngoing && bOngoing) return 1;

		if (aOngoing && bOngoing) {
			return entryDateStart(b).getTime() - entryDateStart(a).getTime();
		}

		return bEnd!.getTime() - aEnd!.getTime();
	});
}
