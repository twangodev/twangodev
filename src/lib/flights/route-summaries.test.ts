import { expect, it } from 'vitest';
import { summarizeRoutes } from './route-summaries';

it('groups repeat and reverse flights while retaining the original arc mapping', () => {
	const a = {
		from: [1, 2] as [number, number],
		to: [3, 4] as [number, number],
		fromIata: 'AAA',
		toIata: 'BBB',
		distance: 120
	};
	const b = { ...a, to: [5, 6] as [number, number], toIata: 'CCC' };
	const reverse = { ...a, from: a.to, to: a.from, fromIata: 'BBB', toIata: 'AAA' };
	const { routeSummaries, routeIds } = summarizeRoutes(
		[a, b, reverse, a],
		[{ iata: 'AAA', city: 'Alpha' }]
	);
	expect(routeSummaries).toHaveLength(2);
	expect(routeIds[0]).toBe(routeIds[2]);
	expect(routeIds[0]).toBe(routeIds[3]);
	expect(routeIds[0]).not.toBe(routeIds[1]);
	expect(routeSummaries[0]).toMatchObject({
		count: 3,
		distance: 120,
		from: { code: 'AAA', city: 'Alpha' },
		to: { code: 'BBB' }
	});
});
it('distinguishes missing airport codes by coordinates and handles an empty log', () => {
	const a = {
		from: [1, 2] as [number, number],
		to: [3, 4] as [number, number],
		fromIata: '???',
		toIata: '???',
		distance: 1
	};
	expect(summarizeRoutes([a, { ...a, to: [5, 6] }], []).routeSummaries).toHaveLength(2);
	expect(summarizeRoutes([], [])).toEqual({ routeSummaries: [], routeIds: [] });
});
