import { describe, expect, it } from 'vitest';
import {
	arcControls,
	arcPoint,
	sampleArc,
	projectPoint,
	projectSegments,
	pickRoute,
	type View
} from './route-picking';

const view: View = { phi: 0, theta: 0, width: 800, height: 600 };
const arc = { from: [0, -90] as [number, number], to: [0, 0] as [number, number] };

describe('COBE route geometry', () => {
	it('matches fixed Bézier shader coordinates and its 32 segments', () => {
		const points = sampleArc(arc);
		expect(points).toHaveLength(33);
		expect(points[0][2]).toBeCloseTo(0.8);
		expect(points[32][0]).toBeCloseTo(0.8);
		// Midpoint = .25 * endpoints + .5 * normalized midpoint * (0.8 + angle/pi).
		expect(points[16][0]).toBeCloseTo(0.2 + 0.65 / Math.sqrt(2));
		expect(points[16][2]).toBeCloseTo(0.2 + 0.65 / Math.sqrt(2));
		const p = projectPoint(points[16], view);
		expect(p.x).toBeCloseTo(400 + 300 * (0.2 + 0.65 / Math.sqrt(2)));
		expect(p.y).toBe(300);
		expect(p.visible).toBe(true);
	});
	it('rotates and projects in CSS pixels with scale and offset', () => {
		const p = projectPoint([0.8, 0, 0], { ...view, phi: -Math.PI / 2 });
		expect(p.x).toBeCloseTo(400);
		expect(p.depth).toBeCloseTo(0.8);
		const q = projectPoint([0, 0.8, 0], { ...view, theta: Math.PI / 2 });
		expect(q.y).toBeCloseTo(300);
		expect(q.depth).toBeCloseTo(0.8);
		const small = projectPoint([0.4, 0, 0.8], {
			...view,
			width: 400,
			height: 300,
			scale: 2,
			offset: [10, 20]
		});
		expect(small.x).toBeCloseTo(330);
		expect(small.y).toBeCloseTo(170);
	});
	it('clips partial segments at trail boundaries and hides future flights', () => {
		const points = sampleArc(arc);
		const segments = projectSegments(points, view, { progress: 0.51, trailLength: 0.2 });
		const lerp = (i: number, t: number) =>
			points[i].map((v, j) => v + (points[i + 1][j] - v) * t) as [number, number, number];
		expect(segments[0].a.x).toBeCloseTo(projectPoint(lerp(9, 0.92), view).x);
		expect(segments.at(-1)!.b.x).toBeCloseTo(projectPoint(lerp(16, 0.32), view).x);
		expect(projectSegments(points, view, { progress: -1, trailLength: 0.01 })).toEqual([]);
	});
	it('clips at the globe silhouette without joining across hidden portions', () => {
		const result = projectSegments(
			[
				[0.6, 0, -0.1],
				[1, 0, -0.1]
			],
			view,
			{}
		);
		expect(result).toHaveLength(1);
		expect(result[0].a.x).toBeCloseTo(640);
		expect(result[0].b.x).toBeCloseTo(700);
		expect(
			projectSegments(
				[
					[0, 0, -0.8],
					[0.2, 0, -0.8]
				],
				view,
				{}
			)
		).toEqual([]);
	});
	it('keeps coincident and antipodal endpoints finite', () => {
		for (const to of [
			[0, 0],
			[0, 180]
		] as [number, number][]) {
			const controls = arcControls({ from: [0, 0], to });
			expect(arcPoint(controls, 0.5).every(Number.isFinite)).toBe(true);
			expect(
				sampleArc({ from: [0, 0], to })
					.flat()
					.every(Number.isFinite)
			).toBe(true);
		}
	});
});

describe('route picking', () => {
	const routes = [
		{ id: 'a', segments: [{ a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }] },
		{ id: 'b', segments: [{ a: { x: 50, y: -50 }, b: { x: 50, y: 50 } }] }
	];
	it('selects the closest route and uses exit hysteresis at crossings', () => {
		expect(pickRoute(routes, { x: 49, y: 4 })).toBe('b');
		expect(pickRoute(routes, { x: 49, y: 4 }, 'a')).toBe('a');
		expect(pickRoute(routes, { x: 20, y: 7 }, 'a')).toBe('a');
		expect(pickRoute(routes, { x: 20, y: 9 }, 'a')).toBeNull();
		expect(pickRoute(routes, { x: 20, y: 7 })).toBeNull();
	});
});
