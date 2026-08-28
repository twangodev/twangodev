import { describe, expect, it } from 'vitest';
import {
	createJetplayPreviewSeries,
	jetplayDailyDownloadsUrl,
	parseMarketplaceDownloadSeries
} from './marketplace-downloads';

describe('jetplayDailyDownloadsUrl', () => {
	it('requests the complete daily series with missing days filled', () => {
		const url = new URL(jetplayDailyDownloadsUrl('2026-08-25'));

		expect(url.pathname).toBe('/statistic/downloads-count/day');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			plugin: '31014',
			startDate: '2026-03-31',
			endDate: '2026-08-25',
			fill: 'full'
		});
	});
});

describe('parseMarketplaceDownloadSeries', () => {
	it('validates, rounds, deduplicates, and sorts Marketplace points', () => {
		expect(
			parseMarketplaceDownloadSeries({
				data: {
					serie: [
						{ name: '2026-04-02', value: 12.4 },
						{ name: 'not-a-date', value: 9 },
						{ name: '2026-04-01', value: -1 },
						{ name: '2026-04-01', value: 7 },
						{ name: '2026-04-02', value: 13 }
					]
				}
			})
		).toEqual([
			{ date: '2026-04-01', downloads: 7 },
			{ date: '2026-04-02', downloads: 13 }
		]);
	});

	it('returns an empty series for an unexpected response', () => {
		expect(parseMarketplaceDownloadSeries({ data: { serie: null } })).toEqual([]);
	});
});

describe('createJetplayPreviewSeries', () => {
	it('covers every day and preserves the requested total', () => {
		const series = createJetplayPreviewSeries(1000, '2026-04-09');

		expect(series).toHaveLength(10);
		expect(series[0]?.date).toBe('2026-03-31');
		expect(series.at(-1)?.date).toBe('2026-04-09');
		expect(series.reduce((sum, point) => sum + point.downloads, 0)).toBe(1000);
	});
});
