import { OrthographicCamera, Vector3 } from 'three';
import type { Tile } from './navigation';
import type { Topic } from './knowledge';
import { bounds, hull, modelPoints, covers, fitNodes, type Rect, type XY } from './label-layout';
import { floorCoordinates, type Point } from './overview';

export const viewCamera = () => {
	const c = new OrthographicCamera();
	c.position.set(12, 18, 12);
	c.lookAt(0, 0.3, 0);
	c.updateMatrixWorld();
	return c;
};
const plane = viewCamera();
export function inPlane(point: Vector3): XY {
	const p = point.clone().applyMatrix4(plane.matrixWorldInverse);
	return [p.x, -p.y];
}
export function fromPlane([x, y]: XY): Point {
	return new Vector3(x, -y, -45).applyMatrix4(plane.matrixWorld).toArray() as Point;
}
export type Side = 'left' | 'right' | 'top';
export type Port = { node: string; side: Side; point: XY; stub: XY };
export type FlowRoute = {
	key: string;
	a: string;
	b: string;
	feedback: boolean;
	start: Port;
	end: Port;
	path: XY[];
	points: Point[];
	endClearance: number;
	strokes: { a: Point; b: Point; start: number; end: number }[];
};
type Obstacle = Rect & { polygon?: XY[] };
function hitsObstacle(a: XY, b: XY, o: Obstacle) {
	return (
		hitsBox(a, b, o) &&
		(!o.polygon ||
			covers(
				{
					x: Math.min(a[0], b[0]),
					y: Math.min(a[1], b[1]),
					width: Math.abs(a[0] - b[0]),
					height: Math.abs(a[1] - b[1])
				},
				o.polygon,
				0.07
			))
	);
}
type Outline = { id: string; key: string; polygon: XY[]; box: Rect; swept: Rect };
export function outline(tile: Tile): Outline {
	const n = { key: tile.key, shape: tile.shape!, position: tile.position, scale: tile.scale ?? 1 };
	const compact = modelPoints(n, false).map(inPlane),
		expanded = modelPoints(n, true).map(inPlane);
	const polygon = hull(compact);
	return {
		id: tile.id,
		key: tile.key,
		polygon,
		box: bounds(polygon),
		swept: bounds([...compact, ...expanded])
	};
}
function boundary(polygon: XY[], side: Side, level: number): XY {
	const horizontal = side !== 'top',
		hits: number[] = [];
	for (let i = 0; i < polygon.length; i++) {
		const a = polygon[i],
			b = polygon[(i + 1) % polygon.length],
			axis = horizontal ? 1 : 0,
			other = 1 - axis;
		if (level < Math.min(a[axis], b[axis]) - 1e-7 || level > Math.max(a[axis], b[axis]) + 1e-7)
			continue;
		if (Math.abs(a[axis] - b[axis]) < 1e-7) hits.push(a[other], b[other]);
		else hits.push(a[other] + ((b[other] - a[other]) * (level - a[axis])) / (b[axis] - a[axis]));
	}
	const edge = side === 'right' ? Math.max(...hits) : Math.min(...hits);
	return horizontal ? [edge, level] : [level, edge];
}
function makePort(n: Outline, side: Side, index: number, count: number): Port {
	const t = count === 1 ? 0.5 : 0.18 + (0.64 * index) / (count - 1),
		b = n.box;
	const p = boundary(n.polygon, side, side === 'top' ? b.x + b.width * t : b.y + b.height * t);
	const stub: XY = [...p];
	if (side === 'right') {
		p[0] += 0.035;
		stub[0] = p[0] + 0.22;
	}
	if (side === 'left') {
		p[0] -= 0.035;
		stub[0] = p[0] - 0.22;
	}
	if (side === 'top') {
		p[1] -= 0.035;
		stub[1] = p[1] - 0.22;
	}
	return { node: n.key, side, point: p, stub };
}
const distance = (a: XY, b: XY) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
export function hitsBox(a: XY, b: XY, r: Rect, pad = 0.07) {
	const left = r.x - pad,
		right = r.x + r.width + pad,
		top = r.y - pad,
		bottom = r.y + r.height + pad;
	if (Math.abs(a[1] - b[1]) < 1e-6)
		return (
			a[1] > top && a[1] < bottom && Math.max(a[0], b[0]) > left && Math.min(a[0], b[0]) < right
		);
	if (Math.abs(a[0] - b[0]) < 1e-6)
		return (
			a[0] > left && a[0] < right && Math.max(a[1], b[1]) > top && Math.min(a[1], b[1]) < bottom
		);
	return true;
}
function clean(points: XY[]) {
	const result: XY[] = [];
	for (const p of points) {
		if (result.length && distance(p, result.at(-1)!) < 1e-6) continue;
		while (result.length > 1) {
			const a = result.at(-2)!,
				b = result.at(-1)!;
			if (Math.abs((b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0])) > 1e-6) break;
			// Never simplify a reversal into a shortcut through the model.
			if ((b[0] - a[0]) * (p[0] - b[0]) + (b[1] - a[1]) * (p[1] - b[1]) < 0) break;
			result.pop();
		}
		result.push(p);
	}
	return result;
}
export function segmentRelation(a: XY, b: XY, c: XY, d: XY): 'overlap' | 'cross' | null {
	const h = Math.abs(a[1] - b[1]) < 1e-6,
		k = Math.abs(c[1] - d[1]) < 1e-6;
	if (h === k) {
		const axis = h ? 0 : 1,
			other = 1 - axis;
		if (
			Math.abs(a[other] - c[other]) < 1e-5 &&
			Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
				Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])) >
				1e-5
		)
			return 'overlap';
	} else {
		const [p, q, r, s] = h ? [a, b, c, d] : [c, d, a, b];
		if (
			r[0] > Math.min(p[0], q[0]) + 1e-5 &&
			r[0] < Math.max(p[0], q[0]) - 1e-5 &&
			p[1] > Math.min(r[1], s[1]) + 1e-5 &&
			p[1] < Math.max(r[1], s[1]) - 1e-5
		)
			return 'cross';
	}
	return null;
}
/** Route the graph together: each incident edge gets its own sorted socket and lane. */
export function routeConnections(
	tiles: Tile[],
	edges: Topic['edges'],
	width = 670,
	height = 400
): FlowRoute[] {
	const shapes = tiles.map(outline),
		find = (id: string) => shapes.find((n) => n.id === id)!;
	const edgesIn = edges.filter(
		([a, b]) => shapes.some((n) => n.id === a) && shapes.some((n) => n.id === b)
	);
	const descriptors = edgesIn.map(([a, b, kind], i) => {
		const source = find(a),
			target = find(b),
			feedback = kind === 'feedback';
		const sameColumn =
			Math.abs(source.box.x + source.box.width / 2 - (target.box.x + target.box.width / 2)) < 0.25;
		const layerLink = a.startsWith('layer:') && b.startsWith('layer:');
		let layerStart: Side = 'right',
			layerEnd: Side = 'left';
		if (layerLink) {
			const from = floorCoordinates(tiles.find((t) => t.id === a)!.position),
				to = floorCoordinates(tiles.find((t) => t.id === b)!.position);
			if (Math.abs(from[1] - to[1]) < 1e-6) {
				layerStart = to[0] > from[0] ? 'right' : 'left';
				layerEnd = layerStart === 'right' ? 'left' : 'right';
			} else {
				// Adjacent rows turn on the same outside edge, clear of layer numbers.
				layerStart = from[0] >= 0 ? 'right' : 'left';
				layerEnd = layerStart;
			}
		}
		// A stage wrapped onto a lower row can receive from the facing side.
		const wrapped =
			width < 480 &&
			!b.startsWith('layer:') &&
			target.box.x < source.box.x - 0.5 &&
			target.box.y > source.box.y + 0.5;
		return {
			key: `${a}:${b}:${i}`,
			a: source.key,
			b: target.key,
			source,
			target,
			feedback,
			startSide: layerLink ? layerStart : feedback ? 'top' : 'right',
			endSide: layerLink
				? layerEnd
				: feedback || (width < 480 && b === 'decoder')
					? 'top'
					: sameColumn || wrapped
						? 'right'
						: 'left'
		} as const;
	});
	const ports = new Map<string, Port>();
	for (const node of shapes)
		for (const side of ['left', 'right', 'top'] as const) {
			const incident = descriptors
				.flatMap((e) => [
					...(e.source === node && e.startSide === side
						? [{ key: e.key + ':start', other: e.target }]
						: []),
					...(e.target === node && e.endSide === side
						? [{ key: e.key + ':end', other: e.source }]
						: [])
				])
				.sort((a, b) =>
					side === 'top' ? a.other.box.x - b.other.box.x : a.other.box.y - b.other.box.y
				);
			incident.forEach((e, i) => ports.set(e.key, makePort(node, side, i, incident.length)));
		}
	// Align compatible ports on their actual silhouettes instead of adding tiny
	// vertical steps. Shared sides keep their distinct, ordered branch sockets.
	for (const e of descriptors) {
		const start = ports.get(e.key + ':start')!,
			end = ports.get(e.key + ':end')!;
		const forward = start.side === 'right' && end.side === 'left' && start.point[0] < end.point[0],
			reverse = start.side === 'left' && end.side === 'right' && start.point[0] > end.point[0];
		if (e.feedback || (!forward && !reverse)) continue;
		const free = (p: Port) =>
			[...ports.values()].filter((q) => q.node === p.node && q.side === p.side).length === 1;
		const startFree = free(start),
			endFree = free(end);
		if (!startFree && !endFree) continue;
		const lo = Math.max(
				e.source.box.y + e.source.box.height * 0.08,
				e.target.box.y + e.target.box.height * 0.08
			),
			hi = Math.min(
				e.source.box.y + e.source.box.height * 0.92,
				e.target.box.y + e.target.box.height * 0.92
			);
		if (lo >= hi) continue;
		const level =
			startFree && endFree
				? Math.max(lo, Math.min(hi, (start.point[1] + end.point[1]) / 2))
				: startFree
					? end.point[1]
					: start.point[1];
		if (level < lo || level > hi) continue;
		for (const [p, n] of [
			[start, e.source],
			[end, e.target]
		] as const) {
			if (!free(p)) continue;
			const direction = p.side === 'right' ? 1 : -1;
			p.point = boundary(n.polygon, p.side, level);
			p.point[0] += direction * 0.035;
			p.stub = [p.point[0] + direction * 0.22, level];
		}
	}
	// Leave a longer straight approach after a row wrap, so its arrowhead fits.
	for (const e of descriptors)
		if (!e.feedback && e.target.box.x < e.source.box.x - 0.5) {
			const port = ports.get(e.key + ':end')!;
			if (port.side === 'left') {
				const stub: XY = [port.point[0] - 0.65, port.point[1]];
				if (
					!shapes.some(
						(n) =>
							n.key !== port.node &&
							hitsObstacle(port.point, stub, { ...n.box, polygon: n.polygon })
					)
				)
					port.stub = stub;
			}
		}
	const frame = fitNodes(
		tiles.map((t) => ({ key: t.key, shape: t.shape!, position: t.position, scale: t.scale ?? 1 })),
		plane,
		width,
		height,
		80
	);
	const units = frame.height / height;
	const boxes: Obstacle[] = shapes.map((n) => ({ ...n.box, polygon: n.polygon }));
	for (const [i, tile] of tiles.entries()) {
		const b = shapes[i].box,
			above =
				tile.parameters !== undefined &&
				(tile.id === 'projector' || floorCoordinates(tile.position)[1] < -2);
		const labelWidth = Math.max(
			20,
			Math.min(width < 480 ? 86 : 110, tile.topic.short.length * (width < 480 ? 5.2 : 5.7) + 10)
		);
		const labelHeight = tile.parameters !== undefined ? 38 : tile.topic.short.length > 16 ? 38 : 24;
		const shelf = {
			x: b.x + b.width / 2 - (labelWidth * units) / 2,
			y: above ? shapes[i].swept.y - (labelHeight + 10) * units : b.y + b.height + 4 * units,
			width: labelWidth * units,
			height: (labelHeight + 8) * units
		};
		// Captions that cannot fit here are placed elsewhere by the label solver.
		// Do not let a speculative caption box block a real connection socket.
		if (
			![...ports.values()].some((p) => hitsBox(p.stub, p.stub, shelf)) &&
			!shapes.some((n) => covers(shelf, n.polygon, 0))
		)
			boxes.push(shelf);
	}
	const routed: FlowRoute[] = [];
	// Ordinary paths get the short lanes. Recurrent paths use the remaining perimeter lanes.
	for (const [index, e] of [...descriptors]
		.sort((a, b) => Number(a.feedback) - Number(b.feedback))
		.entries()) {
		const start = ports.get(e.key + ':start')!,
			end = ports.get(e.key + ':end')!,
			s = start.stub,
			t = end.stub;
		const lane = 0.24 + (index % 4) * 0.1;
		const all = bounds(
			boxes.flatMap(
				(b) =>
					[
						[b.x, b.y],
						[b.x + b.width, b.y + b.height]
					] as XY[]
			)
		);
		const xs = [
			(s[0] + t[0]) / 2,
			(s[0] + t[0]) / 2 - lane,
			(s[0] + t[0]) / 2 + lane,
			all.x - lane - 0.3,
			all.x + all.width + lane + 0.3
		];
		const ys = [(s[1] + t[1]) / 2, all.y - lane - 0.3, all.y + all.height + lane + 0.3];
		// Additional gutters handle skip connections without going through another node.
		for (const b of boxes) {
			xs.push(b.x - 0.15 - lane * 0.1, b.x + b.width + 0.15 + lane * 0.1);
			ys.push(b.y - 0.15 - lane * 0.1, b.y + b.height + 0.15 + lane * 0.1);
		}
		const candidates: XY[][] = [];
		if (Math.abs(s[0] - t[0]) < 1e-6 || Math.abs(s[1] - t[1]) < 1e-6) candidates.push([s, t]);
		candidates.push([s, [t[0], s[1]], t], [s, [s[0], t[1]], t]);
		for (const x of xs) candidates.push([s, [x, s[1]], [x, t[1]], t]);
		for (const y of ys) candidates.push([s, [s[0], y], [t[0], y], t]);
		const sx = start.side === 'left' ? -1 : start.side === 'right' ? 1 : 0,
			tx = end.side === 'left' ? -1 : end.side === 'right' ? 1 : 0;
		for (const y of ys)
			for (const offset of [0.16, 0.32, 0.55]) {
				const ax = s[0] + sx * (lane + offset),
					bx = t[0] + tx * (lane + offset * 1.3);
				candidates.push([s, [ax, s[1]], [ax, y], [bx, y], [bx, t[1]], t]);
			}
		let best: XY[] | undefined,
			score = Infinity;
		const assess = (middle: XY[]) => {
			middle = clean(middle);
			if (middle.slice(1).some((p, i) => boxes.some((b) => hitsObstacle(middle[i], p, b)))) return;
			const path = clean([start.point, ...middle, end.point]);
			if (
				path
					.slice(1, -1)
					.some(
						(p, i) =>
							(p[0] - path[i][0]) * (path[i + 2][0] - p[0]) +
								(p[1] - path[i][1]) * (path[i + 2][1] - p[1]) <
							-1e-6
					)
			)
				return;
			// Escape/approach legs may touch their own model, but never a neighbouring one.
			if (
				shapes.some(
					(n) =>
						n.key !== start.node && hitsObstacle(start.point, s, { ...n.box, polygon: n.polygon })
				)
			)
				return;
			if (
				shapes.some(
					(n) => n.key !== end.node && hitsObstacle(t, end.point, { ...n.box, polygon: n.polygon })
				)
			)
				return;
			let cost =
				path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0) +
				(path.length - 2) * units * 8;
			// Equal-length elbow routes should turn in the open corridor, not in
			// the few pixels immediately beside a shape or its arrowhead.
			const approach = Math.min(units * 16, distance(start.point, end.point) / 3);
			cost +=
				2 *
				(Math.max(0, approach - distance(path[0], path[1])) +
					Math.max(0, approach - distance(path.at(-2)!, path.at(-1)!)));
			for (const other of routed)
				for (let i = 1; i < path.length; i++)
					for (let j = 1; j < other.path.length; j++) {
						const relation = segmentRelation(
							path[i - 1],
							path[i],
							other.path[j - 1],
							other.path[j]
						);
						if (relation === 'overlap') return;
						// A crossing gap is cheaper than a lap around unrelated components.
						else if (relation === 'cross') cost += units * 12;
					}
			if (e.feedback) cost += Math.max(0, Math.min(...path.map((p) => p[1])) - all.y) * 4;
			if (cost < score) {
				score = cost;
				best = path;
			}
		};
		candidates.forEach(assess);
		if (
			!best ||
			(!e.feedback &&
				best.slice(1).reduce((sum, p, i) => sum + distance(best![i], p), 0) >
					distance(start.point, end.point) * 1.35)
		) {
			// Look for a shorter local path when the simple candidates make a long detour.
			const path = detour(start, end, boxes, routed, units);
			if (path) assess(path);
		}
		if (!best) throw new Error(`No clear route for ${e.key}`);
		routed.push({
			key: e.key,
			a: e.a,
			b: e.b,
			feedback: e.feedback,
			start,
			end,
			path: best,
			points: best.map(fromPlane),
			strokes: [],
			endClearance: Math.min(
				...[...ports.values()]
					.filter((p) => p.node === end.node && p !== end)
					.map((p) => Math.hypot(p.point[0] - end.point[0], p.point[1] - end.point[1]))
			)
		});
	}
	// Break the later stroke at crossings. The route itself stays straight,
	// and dash distances include the gap so the pattern does not restart.
	for (let r = 0; r < routed.length; r++) {
		const route = routed[r];
		let offset = 0;
		for (let i = 1; i < route.path.length; i++) {
			const a = route.path[i - 1],
				b = route.path[i],
				length = distance(a, b),
				horizontal = Math.abs(a[1] - b[1]) < 1e-6;
			const cuts: [number, number][] = [];
			for (const prior of routed.slice(0, r))
				for (let j = 1; j < prior.path.length; j++) {
					const c = prior.path[j - 1],
						d = prior.path[j];
					if (segmentRelation(a, b, c, d) !== 'cross') continue;
					const center = distance(a, horizontal ? [c[0], a[1]] : [a[0], c[1]]);
					const halfGap = Math.min(units * 3, center / 3, (length - center) / 3);
					cuts.push([center - halfGap, center + halfGap]);
				}
			cuts.sort((a, b) => a[0] - b[0]);
			const point = (distance: number) =>
				fromPlane([
					a[0] + ((b[0] - a[0]) * distance) / length,
					a[1] + ((b[1] - a[1]) * distance) / length
				]);
			const stroke = (start: number, end: number) => {
				if (end - start > 1e-6)
					route.strokes.push({
						a: point(start),
						b: point(end),
						start: offset + start,
						end: offset + end
					});
			};
			let cursor = 0;
			for (const [start, end] of cuts) {
				stroke(cursor, start);
				cursor = Math.max(cursor, end);
			}
			stroke(cursor, length);
			offset += length;
		}
	}
	return routed;
}

function detour(
	startPort: Port,
	endPort: Port,
	boxes: Obstacle[],
	prior: FlowRoute[],
	units: number
): XY[] | undefined {
	const start = startPort.stub,
		end = endPort.stub;
	const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
	const xs = unique([start[0], end[0], ...boxes.flatMap((b) => [b.x - 0.2, b.x + b.width + 0.2])]);
	const ys = unique([start[1], end[1], ...boxes.flatMap((b) => [b.y - 0.2, b.y + b.height + 0.2])]);
	const width = xs.length,
		node = (x: number, y: number) => y * width + x;
	// Search position and direction together, so a short zigzag cannot beat a clean elbow.
	const outward = (port: Port) => (port.side === 'right' ? 0 : port.side === 'left' ? 2 : 3);
	const source = node(xs.indexOf(start[0]), ys.indexOf(start[1])) * 4 + outward(startPort),
		target = node(xs.indexOf(end[0]), ys.indexOf(end[1]));
	const point = (state: number): XY => {
		const id = Math.floor(state / 4);
		return [xs[id % width], ys[Math.floor(id / width)]];
	};
	const costs = new Map([[source, 0]]),
		previous = new Map<number, number>(),
		open = new Set([source]);
	while (open.size) {
		let current = -1,
			best = Infinity;
		for (const id of open) {
			const score = costs.get(id)! + distance(point(id), end);
			if (score < best) {
				best = score;
				current = id;
			}
		}
		const id = Math.floor(current / 4),
			heading = current % 4;
		if (id === target && heading !== outward(endPort)) {
			const path: XY[] = [];
			for (
				let state: number | undefined = current;
				state !== undefined;
				state = previous.get(state)
			)
				path.push(point(state));
			return clean(path.reverse());
		}
		open.delete(current);
		const x = id % width,
			y = Math.floor(id / width),
			p = point(current);
		for (const [direction, [dx, dy]] of [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1]
		].entries()) {
			if (direction === (heading + 2) % 4) continue;
			const nx = x + dx,
				ny = y + dy;
			if (nx < 0 || nx >= width || ny < 0 || ny >= ys.length) continue;
			const next = node(nx, ny) * 4 + direction,
				q = point(next);
			if (boxes.some((b) => hitsObstacle(p, q, b))) continue;
			let crossing = 0,
				shared = false;
			for (const route of prior)
				for (let i = 1; i < route.path.length; i++) {
					const relation = segmentRelation(p, q, route.path[i - 1], route.path[i]);
					if (relation === 'overlap') shared = true;
					if (relation === 'cross') crossing += units * 12;
				}
			if (shared) continue;
			const cost =
				costs.get(current)! + distance(p, q) + crossing + (direction === heading ? 0 : units * 8);
			if (cost < (costs.get(next) ?? Infinity)) {
				costs.set(next, cost);
				previous.set(next, current);
				open.add(next);
			}
		}
	}
}
