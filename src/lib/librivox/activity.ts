export const LIBRIVOX_WEEKS_PER_YEAR = 53;
export const LIBRIVOX_HOURS_PER_WINDOW = 3;
export const LIBRIVOX_WINDOWS_PER_WEEK = (24 / LIBRIVOX_HOURS_PER_WINDOW) * 7;

export type LibrivoxActivityBin = [index: number, count: number];

export interface LibrivoxActivityYear {
	year: number;
	weeks: number[];
	windows?: LibrivoxActivityBin[][];
}

export interface LibrivoxActivityData {
	generatedAt: string;
	totalBooks: number;
	totalSegments: number;
	years: LibrivoxActivityYear[];
}

export interface LibrivoxActivitySnapshot extends LibrivoxActivityData {
	storageBytes: number;
	totalAudioSeconds: number;
}

export interface LibrivoxActivityItem {
	publicDate: unknown;
	segmentCount: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function publicDate(value: unknown): Date | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (typeof raw !== 'string') return undefined;

	// Internet Archive timestamps stored in the mirror predate consistent ISO formatting.
	const date = new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`);
	return Number.isFinite(date.getTime()) ? date : undefined;
}

export function aggregateLibrivoxActivity(
	items: LibrivoxActivityItem[],
	generatedAt = new Date()
): LibrivoxActivityData {
	const counts = new Map<number, number[]>();
	const windowCounts = new Map<number, number[][]>();
	let firstYear = Number.POSITIVE_INFINITY;
	let totalBooks = 0;
	let totalSegments = 0;

	for (const item of items) {
		const date = publicDate(item.publicDate);
		const segmentCount = item.segmentCount;
		if (
			!date ||
			date.getTime() > generatedAt.getTime() ||
			typeof segmentCount !== 'number' ||
			!Number.isSafeInteger(segmentCount) ||
			segmentCount <= 0
		) {
			continue;
		}

		const year = date.getUTCFullYear();
		const yearStart = Date.UTC(year, 0, 1);
		const week = Math.min(
			LIBRIVOX_WEEKS_PER_YEAR - 1,
			Math.floor((date.getTime() - yearStart) / WEEK_MS)
		);
		const day = Math.floor((date.getTime() - yearStart) / DAY_MS) - week * 7;
		const window =
			day * (24 / LIBRIVOX_HOURS_PER_WINDOW) +
			Math.floor(date.getUTCHours() / LIBRIVOX_HOURS_PER_WINDOW);
		const weeks = counts.get(year) ?? Array<number>(LIBRIVOX_WEEKS_PER_YEAR).fill(0);
		const windows =
			windowCounts.get(year) ??
			Array.from({ length: LIBRIVOX_WEEKS_PER_YEAR }, () =>
				Array<number>(LIBRIVOX_WINDOWS_PER_WEEK).fill(0)
			);
		weeks[week] += segmentCount;
		windows[week][window] += segmentCount;
		counts.set(year, weeks);
		windowCounts.set(year, windows);
		firstYear = Math.min(firstYear, year);
		totalBooks += 1;
		totalSegments += segmentCount;
	}

	if (totalBooks === 0 || !Number.isFinite(firstYear)) {
		throw new Error('No valid mirrored LibriVox segment activity');
	}

	const years: LibrivoxActivityYear[] = [];
	for (let year = firstYear; year <= generatedAt.getUTCFullYear(); year += 1) {
		const windows =
			windowCounts.get(year) ??
			Array.from({ length: LIBRIVOX_WEEKS_PER_YEAR }, () =>
				Array<number>(LIBRIVOX_WINDOWS_PER_WEEK).fill(0)
			);
		years.push({
			year,
			weeks: counts.get(year) ?? Array<number>(LIBRIVOX_WEEKS_PER_YEAR).fill(0),
			windows: windows.map((bins) =>
				bins.flatMap((count, index): LibrivoxActivityBin[] => (count === 0 ? [] : [[index, count]]))
			)
		});
	}

	return {
		generatedAt: generatedAt.toISOString(),
		totalBooks,
		totalSegments,
		years
	};
}

export { LIBRIVOX_ACTIVITY_FALLBACK } from './activity-fallback';
