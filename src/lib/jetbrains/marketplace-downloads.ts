export interface MarketplaceDownloadPoint {
	date: string;
	downloads: number;
}

interface MarketplaceStatisticResponse {
	data?: {
		serie?: unknown;
	};
}

export const JETPLAY_PLUGIN_ID = 31014;
export const JETPLAY_PUBLISHED_DATE = '2026-03-31';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function utcDateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function jetplayDailyDownloadsUrl(endDate = utcDateString(new Date())): string {
	const url = new URL('https://plugins.jetbrains.com/statistic/downloads-count/day');
	url.searchParams.set('plugin', String(JETPLAY_PLUGIN_ID));
	url.searchParams.set('startDate', JETPLAY_PUBLISHED_DATE);
	url.searchParams.set('endDate', endDate);
	url.searchParams.set('fill', 'full');
	return url.toString();
}

export function parseMarketplaceDownloadSeries(value: unknown): MarketplaceDownloadPoint[] {
	const response = value as MarketplaceStatisticResponse;
	const serie = response?.data?.serie;
	if (!Array.isArray(serie)) return [];

	const points = new Map<string, number>();
	for (const item of serie) {
		if (!item || typeof item !== 'object') continue;

		const { name, value: downloads } = item as { name?: unknown; value?: unknown };
		if (
			typeof name !== 'string' ||
			!ISO_DATE.test(name) ||
			typeof downloads !== 'number' ||
			!Number.isFinite(downloads) ||
			downloads < 0
		) {
			continue;
		}

		points.set(name, Math.round(downloads));
	}

	return Array.from(points, ([date, downloads]) => ({ date, downloads })).sort((a, b) =>
		a.date.localeCompare(b.date)
	);
}

/**
 * Deterministic, clearly labelled development-only data for reviewing the card
 * before a Marketplace token is configured. It is never used in production.
 */
export function createJetplayPreviewSeries(
	totalDownloads: number,
	endDate = utcDateString(new Date())
): MarketplaceDownloadPoint[] {
	const start = Date.parse(`${JETPLAY_PUBLISHED_DATE}T00:00:00Z`);
	const end = Date.parse(`${endDate}T00:00:00Z`);
	if (!Number.isFinite(end) || end < start || totalDownloads <= 0) return [];

	const dayMs = 86_400_000;
	const dayCount = Math.floor((end - start) / dayMs) + 1;
	const weights = Array.from({ length: dayCount }, (_, index) => {
		const progress = index / Math.max(dayCount - 1, 1);
		const weekly = 0.12 * Math.sin((index / 7) * Math.PI * 2);
		const launch = 2.8 * Math.exp(-index / 7);
		const releaseSpike = index % 31 === 0 ? 0.75 : 0;
		return Math.max(0.1, 0.65 + progress * 1.25 + weekly + launch + releaseSpike);
	});
	const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
	const values = weights.map((weight) => Math.floor((weight / weightTotal) * totalDownloads));

	let remainder = totalDownloads - values.reduce((sum, value) => sum + value, 0);
	for (
		let index = values.length - 1;
		remainder > 0;
		index = (index - 1 + values.length) % values.length
	) {
		values[index] += 1;
		remainder -= 1;
	}

	return values.map((downloads, index) => ({
		date: new Date(start + index * dayMs).toISOString().slice(0, 10),
		downloads
	}));
}
