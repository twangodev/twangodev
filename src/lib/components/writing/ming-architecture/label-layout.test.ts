import { describe, expect, it } from 'vitest';
import { gridView, diagramHeight, type Tile } from './navigation';
import { floorCoordinates, formatParameters } from './overview';
import { gridGeometry } from './grid-geometry';
import { routeConnections, viewCamera } from './flow-routing';
import { covers, overlaps, fitNodes, projectNode, screenPoint, placeLabels } from './label-layout';

const paths = [
	[],
	['decoder'],
	['audio'],
	['audio', 'encoder', 'audio-block'],
	['decoder', 'layer:1'],
	['decoder', 'layer:5'],
	['decoder', 'layer:1', 'kda'],
	['decoder', 'layer:3', 'mla'],
	['decoder', 'layer:1', 'moe', 'experts', 'expert'],
	['decoder', 'layer:1', 'moe', 'experts', 'expert', 'expert-gate'],
	['talker-system', 'talker', 'flow', 'dit'],
	['vae'],
	['mtp']
];

describe('model label placement', () => {
	it.each([
		['tiny', 670],
		['flash', 670],
		['tiny', 270],
		['flash', 270]
	] as const)('%s labels avoid collapsed and expanded geometry at %i px', (variant, width) => {
		const geometry = gridGeometry();
		try {
			for (const path of paths) {
				const view = gridView(variant, path, width),
					tiles: Tile[] = view.tiles;
				const height = diagramHeight(view, width);
				const wires = routeConnections(tiles, view.edges, width, height).map((c) =>
					geometry.wire(c)
				);
				const camera = viewCamera();
				const nodes = tiles.map((t) => ({
					key: t.key,
					position: t.position,
					scale: t.scale ?? 1,
					shape: t.shape!
				}));
				const frame = fitNodes(
					nodes,
					camera,
					width,
					height,
					path.length ? 54 : 100,
					!path.length,
					wires.flatMap((w) => w.points)
				);
				const fontSize = width < 480 ? 10 : 11,
					measure = (s: string) => s.length * fontSize * 0.52;
				const requests = tiles.map((t) => {
					const lines: string[] = [];
					for (const word of t.topic.short.split(/\s+/)) {
						const last = lines.at(-1);
						if (last && measure(`${last} ${word}`) < (width < 480 ? 76 : 100))
							lines[lines.length - 1] = `${last} ${word}`;
						else lines.push(word);
					}
					return {
						key: t.key,
						width: Math.max(
							20,
							Math.ceil(
								Math.max(
									...lines.map(measure),
									t.parameters ? measure(formatParameters(t.parameters)) : 0
								)
							) + 10
						),
						height: Math.max(
							24,
							Math.ceil(lines.length * fontSize * 1.4 + (t.parameters ? 12 : 0)) + 6
						),
						above:
							t.parameters !== undefined &&
							(t.id === 'projector' || floorCoordinates(t.position)[1] < -2)
					};
				});

				try {
					let result: ReturnType<typeof placeLabels> = { labels: [], missing: [] };
					let projected: ReturnType<typeof projectNode>[] = [];
					for (let attempt = 0; attempt < 9; attempt++) {
						const h = frame.height * 1.12 ** attempt;
						camera.left = frame.x - (h * width) / height / 2;
						camera.right = frame.x + (h * width) / height / 2;
						camera.top = frame.y + h / 2;
						camera.bottom = frame.y - h / 2;
						camera.updateProjectionMatrix();
						projected = nodes.map((n) => projectNode(n, camera, width, height));
						const flow = wires.map((w) =>
							w.points.map((p) => screenPoint(p, camera, width, height))
						);
						result = placeLabels(requests, projected, width, height, flow);
						if (!result.missing.length) break;
					}
					const name = `${variant} ${path.join('/') || 'model'}`;
					expect(result.missing, name).toEqual([]);
					expect(result.labels, name).toHaveLength(tiles.length);
					for (const [i, label] of result.labels.entries()) {
						if (path.length === 1 && path[0] === 'decoder') {
							const own = projected.find((n) => n.key === label.key)!.bounds;
							expect(
								Math.abs(label.x + label.width / 2 - (own.x + own.width / 2)),
								`${name}: label ${label.key} must stay under its own layer`
							).toBeLessThan(2);
						}

						expect(label.x, name).toBeGreaterThanOrEqual(7);
						expect(label.y, name).toBeGreaterThanOrEqual(7);
						expect(label.x + label.width, name).toBeLessThanOrEqual(width - 7);
						expect(label.y + label.height, name).toBeLessThanOrEqual(height - 7);
						expect(
							projected.some((n) => covers(label, n.expanded, 3)),
							`${name}: ${label.key}`
						).toBe(false);
						expect(
							result.labels.slice(i + 1).some((other) => overlaps(label, other, 4)),
							name
						).toBe(false);
					}
				} finally {
					wires.forEach((w) => w.dispose());
				}
			}
		} finally {
			geometry.dispose();
		}
	});
	it('distinguishes a sloping silhouette from the empty corners of its bounding box', () => {
		const diamond: [number, number][] = [
			[0, 10],
			[10, 0],
			[20, 10],
			[10, 20]
		];
		expect(covers({ x: 0, y: 0, width: 3, height: 3 }, diamond, 0)).toBe(false);
		expect(covers({ x: 7, y: 7, width: 6, height: 6 }, diamond, 0)).toBe(true);
	});
});
