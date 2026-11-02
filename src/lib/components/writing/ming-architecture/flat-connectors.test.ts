import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { gridView } from './navigation';
import { floorPoint, floorCoordinates } from './overview';
import { inPlane, routeConnections, viewCamera } from './flow-routing';
import { gridGeometry } from './grid-geometry';

describe('flat diagram connectors', () => {
	it('projects a model row horizontally without camera skew', () => {
		for (const row of [-5, 0, 5]) {
			const a = inPlane(new Vector3(...floorPoint(-8, row)));
			const b = inPlane(new Vector3(...floorPoint(8, row)));
			expect(a[1]).toBeCloseTo(b[1], 10);
			expect(b[0]).toBeGreaterThan(a[0]);
		}
	});
	it.each(['tiny', 'flash'] as const)(
		'%s layer runs have level ports and no diagonal shortcut',
		(variant) => {
			const view = gridView(variant, ['decoder']);
			const routes = routeConnections(view.tiles, view.edges);
			for (const route of routes) {
				const a = view.tiles.find((t) => t.key === route.a)!,
					b = view.tiles.find((t) => t.key === route.b)!;
				if (Math.abs(floorCoordinates(a.position)[1] - floorCoordinates(b.position)[1]) > 1e-8)
					continue;
				expect(route.start.point[1]).toBeCloseTo(route.end.point[1], 10);
				for (const p of route.points)
					expect(inPlane(new Vector3(...p))[1]).toBeCloseTo(route.start.point[1], 10);
			}
		}
	);
	it('keeps straight lines, arrowheads and unlit flow dots on one screen-facing plane', () => {
		const view = gridView('tiny', ['decoder', 'layer:1', 'kda']),
			camera = viewCamera(),
			geometry = gridGeometry();
		const wires = routeConnections(view.tiles, view.edges).map((route) => geometry.wire(route));
		try {
			for (const wire of wires) {
				wire.marker.position.copy(wire.points[Math.floor(wire.points.length / 2)]);
				wire.marker.scale.setScalar(0.05);
				wire.arrow.scale.setScalar(0.1);
				geometry.root.updateMatrixWorld(true);
				const depth = wire.points[0].clone().applyMatrix4(camera.matrixWorldInverse).z;
				for (let i = 1; i < wire.points.length; i++) {
					const a = inPlane(wire.points[i - 1]),
						b = inPlane(wire.points[i]);
					expect(Math.min(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBeLessThan(1e-8);
					expect(wire.points[i].distanceTo(wire.points[i - 1])).toBeGreaterThan(1e-6);
				}

				for (const p of wire.points)
					expect(p.clone().applyMatrix4(camera.matrixWorldInverse).z).toBeCloseTo(depth, 8);
				for (const mesh of [wire.marker, wire.arrow]) {
					const positions = mesh.geometry.getAttribute('position');
					for (let i = 0; i < positions.count; i++) {
						const p = new Vector3()
							.fromBufferAttribute(positions, i)
							.applyMatrix4(mesh.matrixWorld)
							.applyMatrix4(camera.matrixWorldInverse);
						expect(p.z).toBeCloseTo(depth, 7);
					}
					expect(mesh.material.isMeshBasicMaterial).toBe(true);
				}
				expect(wire.material.worldUnits).toBe(false);
			}
		} finally {
			wires.forEach((w) => w.dispose());
			geometry.dispose();
		}
	});
});
