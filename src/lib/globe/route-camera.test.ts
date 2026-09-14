import { describe, expect, it } from 'vitest';
import { focusRoute, RouteCamera } from './route-camera';
import { projectPoint, sampleArc, type View } from './route-picking';
const base: View = { phi: 0, theta: 0.3, width: 800, height: 800 };
const arc = { from: [10, -100] as [number, number], to: [20, -80] as [number, number] };

describe('route focus camera', () => {
	it('zooms a route around the acquisition point without rotating it', () => {
		const world = sampleArc(arc)[10];
		const pivot = projectPoint(world, base);
		const view = focusRoute(arc, base, pivot);
		expect(view.scale).toBe(1.8);
		expect(view.phi).toBe(base.phi);
		expect(view.theta).toBe(base.theta);
		const anchored = projectPoint(world, view);
		expect(anchored.x).toBeCloseTo(pivot.x);
		expect(anchored.y).toBeCloseTo(pivot.y);
	});
	it('keeps the point under the cursor fixed throughout the entire animation', () => {
		const camera = new RouteCamera();
		const world = sampleArc(arc)[7];
		const pivot = projectPoint(world, base);
		const focus = { id: 'a', arc, pivot };
		camera.step(base, null, 0);
		for (const now of [0, 80, 160, 240, 320, 400, 480, 800]) {
			const view = camera.step(base, focus, now);
			const point = projectPoint(world, view);
			expect(point.x).toBeCloseTo(pivot.x, 8);
			expect(point.y).toBeCloseTo(pivot.y, 8);
		}
		camera.step(base, null, 900);
		for (const now of [980, 1060, 1140, 1220, 1300, 1380]) {
			const view = camera.step(base, null, now);
			const point = projectPoint(world, view);
			expect(point.x).toBeCloseTo(pivot.x, 8);
			expect(point.y).toBeCloseTo(pivot.y, 8);
		}
	});
	it('fits long routes without arbitrarily magnifying them', () => {
		const long = { from: [0, -170] as [number, number], to: [0, -10] as [number, number] };
		const view = focusRoute(long, base);
		expect(view.scale).toBeLessThan(1.8);
		const points = sampleArc(long).map((p) => projectPoint(p, view));
		expect(points.every((p) => p.x >= 40 && p.x <= 760 && p.y >= 40 && p.y <= 760)).toBe(true);
	});
	it('eases in, switches continuously, and returns exactly to the original view', () => {
		const camera = new RouteCamera();
		camera.step(base, null, 0);
		expect(camera.step(base, { id: 'a', arc }, 10).scale).toBe(1);
		const halfway = camera.step(base, { id: 'a', arc }, 250);
		expect(halfway.scale).toBeCloseTo(1.4);
		const second = { id: 'b', arc: { ...arc, to: [25, 139] as [number, number] } };
		expect(camera.step(base, second, 250)).toEqual(halfway);
		camera.step(base, second, 730);
		camera.step(base, null, 740);
		expect(camera.active).toBe(true);
		const restored = camera.step(base, null, 1220);
		expect(restored.scale).toBe(1);
		expect(Math.sin(restored.phi - base.phi)).toBeCloseTo(0);
		expect(restored.theta).toBeCloseTo(base.theta);
		expect(restored.offset?.[0]).toBeCloseTo(0);
		expect(restored.offset?.[1]).toBeCloseTo(0);
		expect(camera.active).toBe(false);
	});
	it('does not move the camera under reduced motion and handles a resized view', () => {
		const camera = new RouteCamera();
		expect(camera.step(base, { id: 'a', arc }, 100, true)).toEqual({
			...base,
			scale: 1,
			offset: [0, 0]
		});
		expect(camera.active).toBe(false);
		const resized = focusRoute(arc, { ...base, width: 360, height: 360 });
		const points = sampleArc(arc).map((p) => projectPoint(p, resized));
		expect(points.every((p) => p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 360)).toBe(true);
	});
});
