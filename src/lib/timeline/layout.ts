import type { TimelineEntry } from '$lib/types/timeline';
import {
	entrySlug,
	entryDateStart,
	entryDateEnd,
	entryBase,
	entryColor,
	sortEntries
} from '$lib/types/timeline';

const DEFAULT_COLORS = [
	'#167bff',
	'#e5534b',
	'#57ab5a',
	'#c69026',
	'#b083f0',
	'#e0823d',
	'#6cb6ff',
	'#f47067'
];

export interface LaneInfo {
	lane: number;
	slug: string;
	color: string;
	ongoing: boolean;
}

/** Maps lane index → slug occupying it */
export type LaneSnapshot = Map<number, { slug: string; color: string; ongoing: boolean }>;

export type GraphRow =
	| MergeRow
	| BranchOutRow
	| MetadataRow
	| CommitRow
	| ForkRow
	| SpacerRow
	| InitialRow;

export interface MergeRow {
	type: 'merge';
	entry: TimelineEntry;
	baseLane: number;
	branchLane: number | null;
	activeLanes: LaneSnapshot;
	color: string;
	rowIndex: number;
	isFirst: boolean;
}

export interface BranchOutRow {
	type: 'branch-out';
	entrySlug: string;
	baseLane: number;
	branchLane: number;
	activeLanes: LaneSnapshot;
	color: string;
	rowIndex: number;
}

export interface MetadataRow {
	type: 'metadata';
	entry: TimelineEntry;
	branchLane: number;
	activeLanes: LaneSnapshot;
	color: string;
	rowIndex: number;
}

export interface CommitRow {
	type: 'commit';
	entrySlug: string;
	commitIndex: number;
	commitMessage: string;
	commitHash: string;
	branchLane: number;
	activeLanes: LaneSnapshot;
	color: string;
	ongoing: boolean;
	isFirst: boolean;
	rowIndex: number;
}

export interface ForkRow {
	type: 'fork';
	entrySlug: string;
	baseLane: number;
	branchLane: number;
	activeLanes: LaneSnapshot;
	color: string;
	rowIndex: number;
}

export interface SpacerRow {
	type: 'spacer';
	activeLanes: LaneSnapshot;
	rowIndex: number;
}

export interface InitialRow {
	type: 'initial';
	activeLanes: LaneSnapshot;
	hash: string;
	rowIndex: number;
}

interface PendingFork {
	entry: TimelineEntry;
	branchLane: number;
	baseLane: number;
	color: string;
}

function randomHash(): string {
	return Math.random().toString(16).slice(2, 9);
}

function resolveColor(entry: TimelineEntry, index: number): string {
	return entryColor(entry) ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function sameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function snapshotLanes(lanes: (string | null)[], colorMap: Map<string, string>, ongoingSet: Set<string>): LaneSnapshot {
	const snapshot: LaneSnapshot = new Map();
	for (let i = 0; i < lanes.length; i++) {
		const slug = lanes[i];
		if (slug !== null) {
			snapshot.set(i, {
				slug,
				color: slug === 'main' ? 'var(--color-muted)' : (colorMap.get(slug) ?? 'var(--color-muted)'),
				ongoing: ongoingSet.has(slug)
			});
		}
	}
	return snapshot;
}

function allocateLane(lanes: (string | null)[], baseLane: number, slug: string): number {
	for (let offset = 1; offset < lanes.length + 1; offset++) {
		const candidate = baseLane + offset;
		if (candidate < lanes.length && lanes[candidate] === null) {
			lanes[candidate] = slug;
			return candidate;
		}
	}
	lanes.push(slug);
	return lanes.length - 1;
}

function resolveBaseLane(
	entry: TimelineEntry,
	activeBranches: Map<string, { branchLane: number }>,
	_lanes: (string | null)[]
): number {
	const base = entryBase(entry);
	if (base === 'main') return 0;

	const parent = activeBranches.get(base);
	if (parent) return parent.branchLane;

	return 0;
}

export function computeGraphLayout(
	entries: TimelineEntry[],
	expandedSlugs: Set<string>
): GraphRow[] {
	const sorted = sortEntries(entries);
	const rows: GraphRow[] = [];
	let rowIndex = 0;

	const lanes: (string | null)[] = ['main'];
	const activeBranches = new Map<string, { branchLane: number; baseLane: number; color: string }>();
	const pendingForks: PendingFork[] = [];
	const ongoingSet = new Set<string>();

	const colorMap = new Map<string, string>();
	sorted.forEach((e, i) => colorMap.set(entrySlug(e), resolveColor(e, i)));

	for (let i = 0; i < sorted.length; i++) {
		const entry = sorted[i];
		const slug = entrySlug(entry);
		const isExpanded = expandedSlugs.has(slug);
		const color = colorMap.get(slug)!;
		const dateEnd = entryDateEnd(entry);
		const isOngoing = dateEnd === null;

		if (isOngoing) ongoingSet.add(slug);

		// Emit deferred forks that should appear above this entry
		const entryEndTime = dateEnd?.getTime() ?? Infinity;
		const toEmit: PendingFork[] = [];
		const remaining: PendingFork[] = [];

		for (const pf of pendingForks) {
			const pfStartTime = entryDateStart(pf.entry).getTime();
			if (pfStartTime >= entryEndTime) {
				toEmit.push(pf);
			} else {
				remaining.push(pf);
			}
		}

		toEmit.sort(
			(a, b) => entryDateStart(b.entry).getTime() - entryDateStart(a.entry).getTime()
		);

		for (const fork of toEmit) {
			rows.push({
				type: 'fork',
				entrySlug: entrySlug(fork.entry),
				baseLane: fork.baseLane,
				branchLane: fork.branchLane,
				activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
				color: fork.color,
				rowIndex: rowIndex++
			});
			lanes[fork.branchLane] = null;
			activeBranches.delete(entrySlug(fork.entry));
		}

		// Add spacer if the last fork's start date doesn't align with this entry's end date
		if (toEmit.length > 0 && dateEnd) {
			const lastForkStart = entryDateStart(toEmit[toEmit.length - 1].entry);
			if (!sameMonth(lastForkStart, dateEnd)) {
				rows.push({
					type: 'spacer',
					activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
					rowIndex: rowIndex++
				});
			}
		}

		pendingForks.length = 0;
		pendingForks.push(...remaining);

		// Allocate lane if expanded
		const baseLane = resolveBaseLane(entry, activeBranches, lanes);
		let branchLane: number | null = null;

		if (isExpanded) {
			branchLane = allocateLane(lanes, baseLane, slug);
			activeBranches.set(slug, { branchLane, baseLane, color });
		}

		// Emit entry header
		const isFirstMerge = i === 0 && rows.length === 0;
		rows.push({
			type: 'merge',
			entry,
			baseLane,
			branchLane,
			activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
			color,
			rowIndex: rowIndex++,
			isFirst: isFirstMerge
		});

		// Emit expanded content
		if (isExpanded && branchLane !== null) {
			// Branch-out curve (from base lane to branch lane) — only for completed entries
			if (!isOngoing) {
				rows.push({
					type: 'branch-out',
					entrySlug: slug,
					baseLane,
					branchLane,
					activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
					color,
					rowIndex: rowIndex++
				});
			}

			// Metadata row (role/tags)
			rows.push({
				type: 'metadata',
				entry,
				branchLane,
				activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
				color,
				rowIndex: rowIndex++
			});

			// Commit rows
			const commits = entry.data.commits;
			for (let ci = 0; ci < commits.length; ci++) {
				rows.push({
					type: 'commit',
					entrySlug: slug,
					commitIndex: ci,
					commitMessage: commits[ci],
					commitHash: randomHash(),
					branchLane,
					activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
					color,
					ongoing: isOngoing,
					isFirst: ci === 0,
					rowIndex: rowIndex++
				});
				// After the first commit, switch from dashed to solid lines
				if (ci === 0 && isOngoing) {
					ongoingSet.delete(slug);
				}
			}

			// Add to pending forks
			pendingForks.push({ entry, branchLane, baseLane, color });
		}
	}

	// Emit remaining forks
	pendingForks.sort(
		(a, b) => entryDateStart(b.entry).getTime() - entryDateStart(a.entry).getTime()
	);

	const hadRemainingForks = pendingForks.length > 0;
	let prevForkStart: Date | null = null;
	for (const fork of pendingForks) {
		// Add spacer between consecutive forks if their start dates don't align
		if (prevForkStart && !sameMonth(entryDateStart(fork.entry), prevForkStart)) {
			rows.push({
				type: 'spacer',
				activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
				rowIndex: rowIndex++
			});
		}
		rows.push({
			type: 'fork',
			entrySlug: entrySlug(fork.entry),
			baseLane: fork.baseLane,
			branchLane: fork.branchLane,
			activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
			color: fork.color,
			rowIndex: rowIndex++
		});
		prevForkStart = entryDateStart(fork.entry);
		lanes[fork.branchLane] = null;
		activeBranches.delete(entrySlug(fork.entry));
	}

	// Spacer before initial commit (only when the nearest entry was expanded)
	if (hadRemainingForks) {
		rows.push({
			type: 'spacer',
			activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
			rowIndex: rowIndex++
		});
	}

	// Initial commit
	rows.push({
		type: 'initial',
		activeLanes: snapshotLanes(lanes, colorMap, ongoingSet),
		hash: randomHash(),
		rowIndex: rowIndex++
	});

	return rows;
}

export function getMaxLane(rows: GraphRow[]): number {
	let max = 0;
	for (const row of rows) {
		for (const lane of row.activeLanes.keys()) {
			if (lane > max) max = lane;
		}
		if ('branchLane' in row && row.branchLane !== null && row.branchLane > max) {
			max = row.branchLane;
		}
	}
	return max;
}
