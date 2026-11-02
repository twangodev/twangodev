import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { gridView, diagramHeight } from './navigation';
import { outline, routeConnections, segmentRelation, inPlane, viewCamera } from './flow-routing';
import { covers, fitNodes } from './label-layout';
import { floorCoordinates } from './overview';

describe('left-to-right architecture flow', () => {
	it('keeps parallel KDA inputs before memory and puts the recurrent return on separate top ports', () => {
		const v = gridView('tiny', ['decoder', 'layer:1', 'kda']);
		const x = (id: string) => floorCoordinates(v.tiles.find((t) => t.id === id)!.position)[0];
		for (const id of ['kda-qkv', 'kda-decay', 'kda-beta'])
			expect(x(id)).toBeLessThan(x('kda-state'));
		for (const id of ['kda-cache', 'kda-output']) expect(x(id)).toBeGreaterThan(x('kda-state'));
		const routes = routeConnections(v.tiles, v.edges);
		const feedback = routes.find((r) => r.feedback)!;
		expect(feedback.start.side).toBe('top');
		expect(feedback.end.side).toBe('top');
		expect(routes.filter((r) => r.b.endsWith('/kda-state'))).toHaveLength(4);
	});
	it.each(['tiny', 'flash'] as const)(
		'%s aligns different-sized shapes without tiny endpoint steps',
		(variant) => {
			for (const [path, straight] of [
				[
					[],
					[
						'audio:projector',
						'decoder:final-norm',
						'final-norm:text-output',
						'text-output:talker-system',
						'talker-system:vae'
					]
				],
				[['decoder', 'layer:1', 'kda'], ['kda-decay:kda-state']],
				[['decoder', 'layer:1', 'moe', 'experts', 'expert'], ['expert-activation:expert-multiply']]
			] as [string[], string[]][]) {
				const view = gridView(variant, path),
					routes = routeConnections(view.tiles, view.edges);
				for (const key of straight) {
					const route = routes.find((r) => r.key.startsWith(key + ':'))!;
					expect(route, key).toBeDefined();
					expect(route.path, key).toHaveLength(2);
					expect(route.start.point[1], key).toBeCloseTo(route.end.point[1], 8);
				}
			}
		}
	);
	it('gives KDA arrowheads a clear approach after necessary bends', () => {
		const view = gridView('tiny', ['decoder', 'layer:1', 'kda']),
			tiles = view.tiles,
			routes = routeConnections(tiles, view.edges);
		const frame = fitNodes(
			tiles.map((t) => ({ ...t, shape: t.shape!, scale: t.scale ?? 1 })),
			viewCamera(),
			670,
			400,
			54,
			false,
			routes.flatMap((r) => r.points.map((p) => new Vector3(...p)))
		);
		for (const key of ['kda-qkv:kda-state', 'kda-state:kda-output']) {
			const route = routes.find((r) => r.key.startsWith(key + ':'))!,
				last = route.path.at(-1)!,
				bend = route.path.at(-2)!;
			expect(route.path, key).toHaveLength(4);
			// Keep enough visible approach for the 7 px arrowhead, even when the
			// ancestor controls change the frame or move the best routing lane.
			expect((Math.abs(last[0] - bend[0]) * 400) / frame.height, key).toBeGreaterThan(16);
		}
	});
	it.each([252, 182])('keeps the wrapped shared-expert route local at %i px', (width) => {
		const view = gridView('tiny', ['decoder', 'layer:1', 'moe'], width);
		const route = routeConnections(view.tiles, view.edges, width, diagramHeight(view, width)).find(
			(r) => r.key.startsWith('shared:expert-sum:')
		)!;
		const direct =
			Math.abs(route.start.point[0] - route.end.point[0]) +
			Math.abs(route.start.point[1] - route.end.point[1]);
		const length = route.path
			.slice(1)
			.reduce(
				(sum, p, i) => sum + Math.abs(p[0] - route.path[i][0]) + Math.abs(p[1] - route.path[i][1]),
				0
			);
		expect(length).toBeLessThan(direct * 1.5);
		expect(route.path.length).toBeLessThanOrEqual(4);
		// A downward connection must not loop up past the source first.
		for (const p of route.path) expect(p[1]).toBeGreaterThanOrEqual(route.start.point[1] - 1e-6);
	});
	it.each([
		['tiny', 670],
		['tiny', 340],
		['tiny', 270],
		['flash', 670],
		['flash', 340],
		['flash', 270]
	] as const)(
		'%s layers follow one continuous sequence with local row turns at %i px',
		(variant, width) => {
			const view = gridView(variant, ['decoder'], width),
				routes = routeConnections(view.tiles, view.edges, width, diagramHeight(view, width));
			for (const [i, tile] of view.tiles.entries()) expect(tile.id).toBe(`layer:${i}`);
			for (const [i, route] of routes.entries()) {
				expect(route.a).toBe(view.tiles[i].key);
				expect(route.b).toBe(view.tiles[i + 1].key);
				const from = floorCoordinates(view.tiles[i].position),
					to = floorCoordinates(view.tiles[i + 1].position),
					row = Math.floor(i / view.columns);
				if ((i + 1) % view.columns === 0) {
					expect(to[0]).toBeCloseTo(from[0], 8);
					expect(to[1]).toBeGreaterThan(from[1]);
					expect(route.start.side).toBe(row % 2 === 0 ? 'right' : 'left');
					expect(route.end.side).toBe(route.start.side);
					// A row turn stays outside these two layers, never crossing the grid.
					const sign = row % 2 === 0 ? 1 : -1;
					const edge = Math.min(sign * route.start.point[0], sign * route.end.point[0]);
					for (const p of route.path) expect(sign * p[0]).toBeGreaterThanOrEqual(edge - 1e-6);
					const length = route.path
						.slice(1)
						.reduce(
							(sum, p, j) => sum + Math.hypot(p[0] - route.path[j][0], p[1] - route.path[j][1]),
							0
						);
					expect(length).toBeLessThan(Math.abs(route.end.point[1] - route.start.point[1]) + 4);
					expect(route.path.length).toBeLessThanOrEqual(4);
				} else {
					expect((to[0] - from[0]) * (row % 2 === 0 ? 1 : -1)).toBeGreaterThan(0);
					expect(route.start.side).toBe(row % 2 === 0 ? 'right' : 'left');
					expect(route.end.side).toBe(row % 2 === 0 ? 'left' : 'right');
					expect(route.path).toHaveLength(2);
				}
			}
		}
	);

	it.each([
		['tiny', 670],
		['tiny', 340],
		['tiny', 270],
		['tiny', 252],
		['tiny', 182],
		['flash', 670],
		['flash', 340],
		['flash', 270],
		['flash', 252],
		['flash', 182]
	] as const)(
		'%s has distinct ports and clear routes throughout the explorer at %i px',
		(variant, width) => {
			const queue: string[][] = [[]],
				seen = new Set<string>();
			while (queue.length) {
				const path = queue.shift()!,
					id = path.at(-1) ?? 'model';
				if (seen.has(id)) continue;
				seen.add(id);
				const view = gridView(variant, path, width),
					tiles = view.tiles;
				const routes = routeConnections(tiles, view.edges, width, diagramHeight(view, width));
				const name = `${variant} ${width} ${path.join('/') || 'model'}`,
					shapes = tiles.map(outline),
					ports = new Set<string>();
				for (const t of view.tiles) if (!seen.has(t.id)) queue.push([...path, t.id]);
				expect(routes, name).toHaveLength(view.edges.length);
				for (const edge of routes) {
					for (let i = 1; i < edge.path.length - 1; i++) {
						const a = edge.path[i - 1],
							b = edge.path[i],
							c = edge.path[i + 1];
						expect(
							(b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]),
							`${name}: no hairpin at ${edge.key}`
						).toBeGreaterThanOrEqual(-1e-6);
					}
					for (const p of [edge.start, edge.end]) {
						const key = `${p.node}:${p.point.map((n) => n.toFixed(5)).join(',')}`;
						expect(ports.has(key), `${name}: shared port ${key}`).toBe(false);
						ports.add(key);
					}
					for (const p of edge.points) expect(p.every(Number.isFinite), name).toBe(true);
					expect(edge.points, name).toHaveLength(edge.path.length);
					for (const [i, p] of edge.points.entries()) {
						const point = inPlane(new Vector3(...p));
						expect(point[0], name).toBeCloseTo(edge.path[i][0], 8);
						expect(point[1], name).toBeCloseTo(edge.path[i][1], 8);
					}

					for (const p of edge.points) {
						const [x, y] = inPlane(new Vector3(...p));
						for (const shape of shapes)
							if (shape.key !== edge.a && shape.key !== edge.b)
								expect(
									covers({ x, y, width: 0, height: 0 }, shape.polygon, 0.01),
									`${name}: rendered crossing through ${shape.id}`
								).toBe(false);
					}

					// Rendering on a plane behind the model preserves the chosen projected ports.
					for (const [world, port] of [
						[edge.points[0], edge.start],
						[edge.points.at(-1)!, edge.end]
					] as const) {
						const projected = inPlane(new Vector3(...world));
						expect(projected[0], name).toBeCloseTo(port.point[0], 8);
						expect(projected[1], name).toBeCloseTo(port.point[1], 8);
					}
					for (let i = 1; i < edge.path.length; i++) {
						const a = edge.path[i - 1],
							b = edge.path[i];
						const rect = {
							x: Math.min(a[0], b[0]),
							y: Math.min(a[1], b[1]),
							width: Math.abs(b[0] - a[0]),
							height: Math.abs(b[1] - a[1])
						};
						for (const shape of shapes)
							if (shape.key !== edge.a && shape.key !== edge.b)
								expect(
									covers(rect, shape.polygon, 0.015),
									`${name}: ${edge.key} through ${shape.id}`
								).toBe(false);
					}
				}
				for (let i = 0; i < routes.length; i++)
					for (let j = i + 1; j < routes.length; j++) {
						const a = routes[i],
							b = routes[j];
						for (let x = 1; x < a.path.length; x++)
							for (let y = 1; y < b.path.length; y++) {
								const relation = segmentRelation(
									a.path[x - 1],
									a.path[x],
									b.path[y - 1],
									b.path[y]
								);
								expect(relation, `${name}: shared path ${a.key}, ${b.key}`).not.toBe('overlap');
								if (relation === 'cross') {
									const horizontal = Math.abs(a.path[x - 1][1] - a.path[x][1]) < 1e-6;
									const point = horizontal
										? [b.path[y - 1][0], a.path[x][1]]
										: [a.path[x][0], b.path[y - 1][1]];
									const covered = b.strokes.some((stroke) => {
										const start = inPlane(new Vector3(...stroke.a)),
											end = inPlane(new Vector3(...stroke.b));
										const dx = end[0] - start[0],
											dy = end[1] - start[1];
										const cross = (point[0] - start[0]) * dy - (point[1] - start[1]) * dx;
										const dot = (point[0] - start[0]) * dx + (point[1] - start[1]) * dy;
										return Math.abs(cross) < 1e-7 && dot >= 0 && dot <= dx * dx + dy * dy;
									});
									expect(covered, `${name}: crossing must have a visible gap`).toBe(false);
								}
							}
					}
			}
			expect(seen.size).toBeGreaterThan(200);
		}
	);
});
