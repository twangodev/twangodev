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
		bidirectional: true,
		distance: 120,
		from: { code: 'AAA', city: 'Alpha' },
		to: { code: 'BBB' }
	});
});
it.each([1, 2])('keeps %i flights in the same direction one-way with departure first', (count) => {
	const flight = {
		from: [3, 4] as [number, number],
		to: [1, 2] as [number, number],
		fromIata: 'BBB',
		toIata: 'AAA',
		distance: 120
	};
	const { routeSummaries } = summarizeRoutes(Array(count).fill(flight), [
		{ iata: 'BBB', city: 'Beta' },
		{ iata: 'AAA', city: 'Alpha' }
	]);
	expect(routeSummaries).toHaveLength(1);
	expect(routeSummaries[0]).toMatchObject({
		from: { code: 'BBB', city: 'Beta' },
		to: { code: 'AAA', city: 'Alpha' },
		count,
		bidirectional: false
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
	expect(
		summarizeRoutes([a, { ...a, from: a.to, to: a.from }], []).routeSummaries[0]
	).toMatchObject({ count: 2, bidirectional: true });
	expect(summarizeRoutes([], [])).toEqual({ routeSummaries: [], routeIds: [] });
});
