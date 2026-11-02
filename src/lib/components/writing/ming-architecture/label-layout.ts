import { OrthographicCamera, Vector3 } from 'three';
import type { Shape } from './shapes';

export type XY = [number, number];
export type Rect = { x: number; y: number; width: number; height: number };
export type LabelRequest = { key: string; width: number; height: number; above: boolean };
export type ProjectedNode = { key: string; hull: XY[]; expanded: XY[]; bounds: Rect };
export type PlacedLabel = Rect & { key: string };
export type LabelNode = {
	key: string;
	position: [number, number, number];
	scale: number;
	shape: Shape;
};

export function hull(points: XY[]): XY[] {
	const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const cross = (o: XY, a: XY, b: XY) =>
		(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
	const half = (points: XY[]) => {
		const result: XY[] = [];
		for (const p of points) {
			while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, p) <= 0) result.pop();
			result.push(p);
		}
		result.pop();
		return result;
	};
	return [...half(sorted), ...half(sorted.reverse())];
}
export function bounds(points: XY[]): Rect {
	const x = Math.min(...points.map((p) => p[0])),
		y = Math.min(...points.map((p) => p[1]));
	return {
		x,
		y,
		width: Math.max(...points.map((p) => p[0])) - x,
		height: Math.max(...points.map((p) => p[1])) - y
	};
}
/** Includes the swept volume of each part, so a hover never pushes geometry into text. */
export function modelPoints(node: LabelNode, expanded: boolean): Vector3[] {
	const result: Vector3[] = [];
	const { shape, scale, position } = node;
	const spread = Number(expanded) / Math.max(1, scale);
	const lift = expanded ? 0.12 : 0;
	for (const part of shape.parts)
		for (const x of [-0.5, 0.5])
			for (const y of [-0.5, 0.5])
				for (const z of [-0.5, 0.5]) {
					const px = x * part.size[0],
						pz = z * part.size[2],
						c = Math.cos(part.rotation),
						s = Math.sin(part.rotation);
					result.push(
						new Vector3(
							position[0] + (part.position[0] + px * c + pz * s + part.travel[0] * spread) * scale,
							position[1] +
								(part.position[1] + y * part.size[1] + part.travel[1] * spread) * scale +
								lift,
							position[2] + (part.position[2] - px * s + pz * c + part.travel[2] * spread) * scale
						)
					);
				}
	for (const line of shape.lines)
		for (const p of line)
			result.push(
				new Vector3(
					position[0] + p[0] * scale,
					position[1] + (p[1] + shape.lineLift * spread) * scale + lift,
					position[2] + p[2] * scale
				)
			);
	return result;
}
/** Reserve CSS-pixel space for the labels, independent of screen density. */
export function fitNodes(
	nodes: LabelNode[],
	camera: OrthographicCamera,
	width: number,
	height: number,
	horizontalPadding: number,
	overview = false,
	routePoints: Vector3[] = []
) {
	const points = nodes
		.flatMap((n) => [...modelPoints(n, false), ...modelPoints(n, true)])
		.concat(routePoints.map((p) => p.clone()))
		.map((p) => p.applyMatrix4(camera.matrixWorldInverse));
	const left = Math.min(...points.map((p) => p.x)),
		right = Math.max(...points.map((p) => p.x));
	const bottom = Math.min(...points.map((p) => p.y)),
		top = Math.max(...points.map((p) => p.y));
	const topSpace = overview ? 58 : 36,
		bottomSpace = overview ? 60 : 44;
	const frameHeight = Math.max(
		(top - bottom) / Math.max(0.1, 1 - (topSpace + bottomSpace) / height),
		(right - left) / Math.max(0.1, (width - horizontalPadding) / height)
	);
	return {
		height: frameHeight,
		x: (left + right) / 2,
		y: (bottom + top) / 2 - (((bottomSpace - topSpace) / 2) * frameHeight) / height
	};
}
export function screenPoint(
	point: Vector3,
	camera: OrthographicCamera,
	width: number,
	height: number
): XY {
	const p = point.clone().project(camera);
	return [((p.x + 1) * width) / 2, ((1 - p.y) * height) / 2];
}
export function projectNode(
	node: LabelNode,
	camera: OrthographicCamera,
	width: number,
	height: number
): ProjectedNode {
	const compact = modelPoints(node, false).map((p) => screenPoint(p, camera, width, height));
	const expanded = modelPoints(node, true).map((p) => screenPoint(p, camera, width, height));
	return {
		key: node.key,
		hull: hull(compact),
		expanded: hull([...compact, ...expanded]),
		bounds: bounds(compact)
	};
}
export function overlaps(a: Rect, b: Rect, padding = 0) {
	return (
		a.x < b.x + b.width + padding &&
		a.x + a.width > b.x - padding &&
		a.y < b.y + b.height + padding &&
		a.y + a.height > b.y - padding
	);
}
/** Separating-axis test keeps labels out of the actual projected silhouette. */
export function covers(rect: Rect, polygon: XY[], padding = 3): boolean {
	const corners: XY[] = [
		[rect.x - padding, rect.y - padding],
		[rect.x + rect.width + padding, rect.y - padding],
		[rect.x + rect.width + padding, rect.y + rect.height + padding],
		[rect.x - padding, rect.y + rect.height + padding]
	];
	const axes: XY[] = [
		[1, 0],
		[0, 1],
		...polygon.map((p, i): XY => {
			const q = polygon[(i + 1) % polygon.length];
			return [q[1] - p[1], p[0] - q[0]];
		})
	];
	for (const [x, y] of axes) {
		const a = corners.map((p) => p[0] * x + p[1] * y),
			b = polygon.map((p) => p[0] * x + p[1] * y);
		if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) return false;
	}
	return true;
}
function crosses(rect: Rect, a: XY, b: XY) {
	// Liang-Barsky clipping, with a small margin around the data-flow stroke.
	const r = { x: rect.x - 2, y: rect.y - 2, width: rect.width + 4, height: rect.height + 4 };
	const dx = b[0] - a[0],
		dy = b[1] - a[1],
		p = [-dx, dx, -dy, dy],
		q = [a[0] - r.x, r.x + r.width - a[0], a[1] - r.y, r.y + r.height - a[1]];
	let lo = 0,
		hi = 1;
	for (let i = 0; i < 4; i++) {
		if (Math.abs(p[i]) < 1e-8) {
			if (q[i] < 0) return false;
			continue;
		}
		const t = q[i] / p[i];
		if (p[i] < 0) lo = Math.max(lo, t);
		else hi = Math.min(hi, t);
		if (lo > hi) return false;
	}
	return true;
}
export function placeLabels(
	requests: LabelRequest[],
	nodes: ProjectedNode[],
	width: number,
	height: number,
	flow: XY[][] = []
): { labels: PlacedLabel[]; missing: string[] } {
	const placed: PlacedLabel[] = [],
		missing: string[] = [];
	const obstacles = nodes.map((n) => ({ hull: n.expanded, box: bounds(n.expanded) }));
	function valid(rect: Rect) {
		return (
			rect.x >= 7 &&
			rect.y >= 7 &&
			rect.x + rect.width <= width - 7 &&
			rect.y + rect.height <= height - 7 &&
			!placed.some((p) => overlaps(rect, p, 5)) &&
			!obstacles.some((o) => overlaps(rect, o.box, 4) && covers(rect, o.hull, 4)) &&
			!flow.some((path) => path.slice(1).some((p, i) => crosses(rect, path[i], p)))
		);
	}
	// Claim each component's own label shelf before trying alternative positions.
	// A long caption must never displace a neighbour's layer number.
	const pending: LabelRequest[] = [];
	for (const request of requests) {
		const node = nodes.find((n) => n.key === request.key)!;
		const b = node.bounds,
			expanded = bounds(node.expanded);
		const rect = {
			key: request.key,
			x: Math.round(b.x + (b.width - request.width) / 2),
			y: Math.round(request.above ? expanded.y - 7 - request.height : b.y + b.height + 7),
			width: request.width,
			height: request.height
		};
		if (valid(rect)) placed.push(rect);
		else pending.push(request);
	}
	for (const request of pending.sort((a, b) => b.width * b.height - a.width * a.height)) {
		const node = nodes.find((n) => n.key === request.key)!;
		const b = node.bounds,
			cx = b.x + b.width / 2,
			cy = b.y + b.height / 2;
		const candidates: { rect: Rect; score: number }[] = [];
		const offer = (x: number, y: number, bias = 0) => {
			const rect = {
				x: Math.round(x),
				y: Math.round(y),
				width: request.width,
				height: request.height
			};
			if (valid(rect))
				candidates.push({
					rect,
					score: Math.hypot(x + request.width / 2 - cx, y + request.height / 2 - cy) + bias
				});
		};
		for (const gap of [7, 15, 27, 43, 67, 99]) {
			offer(cx - request.width / 2, b.y + b.height + gap, request.above ? 80 : 0);
			offer(cx - request.width / 2, b.y - gap - request.height, request.above ? 0 : 80);
			for (const shift of [0, -16, 16, -32, 32]) {
				offer(b.x - request.width - gap, cy - request.height / 2 + shift, 80);
				offer(b.x + b.width + gap, cy - request.height / 2 + shift, 80);
			}
			for (const dx of [-1, 1])
				for (const dy of [-1, 1])
					offer(
						cx + dx * (b.width / 2 + gap) - (dx < 0 ? request.width : 0),
						cy + dy * (b.height / 2 + gap) - (dy < 0 ? request.height : 0),
						100
					);
		}
		if (!candidates.length)
			for (let y = 8; y <= height - request.height - 8; y += 8)
				for (let x = 8; x <= width - request.width - 8; x += 8) offer(x, y, 35);
		candidates.sort((a, b) => a.score - b.score);
		const best = candidates[0];
		if (best) placed.push({ ...best.rect, key: request.key });
		else missing.push(request.key);
	}
	return { labels: placed, missing };
}
