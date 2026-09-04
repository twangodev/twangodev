import { describe, expect, it } from 'vitest';
import {
	LIBRIVOX_ACTIVITY_FALLBACK,
	LIBRIVOX_HOURS_PER_WINDOW,
	LIBRIVOX_WINDOWS_PER_WEEK,
	LIBRIVOX_WEEKS_PER_YEAR,
	aggregateLibrivoxActivity
} from './activity';

describe('aggregateLibrivoxActivity', () => {
	it('groups exact segment counts into 53 seven-day blocks per year', () => {
		const snapshot = aggregateLibrivoxActivity(
			[
				{ publicDate: '2005-12-31 12:00:00', segmentCount: 10 },
				{ publicDate: ['2006-01-01T00:00:00Z'], segmentCount: 2 },
				{ publicDate: '2006-01-01T02:59:59Z', segmentCount: 3 },
				{ publicDate: '2006-01-08T00:00:00Z', segmentCount: 4 },
				{ publicDate: 'not-a-date', segmentCount: 8 },
				{ publicDate: '2006-01-09T00:00:00Z', segmentCount: 0 },
				{ publicDate: '2007-01-01T00:00:00Z', segmentCount: 9 }
			],
			new Date('2006-01-15T00:00:00Z')
		);

		expect(snapshot.totalBooks).toBe(4);
		expect(snapshot.totalSegments).toBe(19);
		expect(snapshot.years.map(({ year }) => year)).toEqual([2005, 2006]);
		expect(snapshot.years.every(({ weeks }) => weeks.length === LIBRIVOX_WEEKS_PER_YEAR)).toBe(
			true
		);
		expect(snapshot.years[0]?.weeks[52]).toBe(10);
		expect(snapshot.years[1]?.weeks[0]).toBe(5);
		expect(snapshot.years[1]?.weeks[1]).toBe(4);
		expect(snapshot.years[0]?.windows?.[52]).toEqual([[4, 10]]);
		expect(snapshot.years[1]?.windows?.[0]).toEqual([[0, 5]]);
		expect(LIBRIVOX_HOURS_PER_WINDOW).toBe(3);
		expect(LIBRIVOX_WINDOWS_PER_WEEK).toBe(56);
		for (const { weeks, windows } of snapshot.years) {
			expect(windows?.map((bins) => bins.reduce((sum, [, count]) => sum + count, 0))).toEqual(
				weeks
			);
		}
	});

	it('rejects an empty set of valid publication dates', () => {
		expect(() => aggregateLibrivoxActivity([], new Date('2026-01-01T00:00:00Z'))).toThrow();
		expect(() =>
			aggregateLibrivoxActivity(
				[{ publicDate: 'nope', segmentCount: 1 }],
				new Date('2026-01-01T00:00:00Z')
			)
		).toThrow();
	});

	it('keeps a complete all-years fallback', () => {
		expect(LIBRIVOX_ACTIVITY_FALLBACK.years[0]?.year).toBe(2005);
		expect(LIBRIVOX_ACTIVITY_FALLBACK.years.at(-1)?.year).toBe(2026);
		expect(
			LIBRIVOX_ACTIVITY_FALLBACK.years
				.flatMap(({ weeks }) => weeks)
				.reduce((sum, count) => sum + count, 0)
		).toBe(LIBRIVOX_ACTIVITY_FALLBACK.totalSegments);
	});
});
