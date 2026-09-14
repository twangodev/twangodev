import type { Arc } from 'cobe';

export type Vec3 = [number, number, number];
export interface View {
	phi: number;
	theta: number;
	width: number;
	height: number;
	scale?: number;
	offset?: [number, number];
}
export interface Point {
	x: number;
	y: number;
}
export interface Segment {
	a: Point;
	b: Point;
}
export interface ProjectedRoute {
	id: string;
	segments: Segment[];
}
const R = 0.8;

function direction([lat, lng]: [number, number]): Vec3 {
	const a = (lat * Math.PI) / 180;
	const b = (lng * Math.PI) / 180 - Math.PI;
	return [-Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)];
}

/** Matches the local COBE arc shader and updateArcGeometry, including its antipodal fallback. */
export function arcControls(arc: Pick<Arc, 'from' | 'to'>, elevation = 0): [Vec3, Vec3, Vec3] {
	const a = direction(arc.from),
		b = direction(arc.to);
	const angle = Math.acos(
		Math.max(
			-1,
			Math.min(
				1,
				a.reduce((s, v, i) => s + v * b[i], 0)
			)
		)
	);
	const sum = a.map((v, i) => v + b[i]) as Vec3;
	const length = Math.hypot(...sum);
	const mid = length > 0.001 ? (sum.map((v) => v / length) as Vec3) : ([0, 1, 0] as Vec3);
	return [
		a.map((v) => v * (R + elevation)) as Vec3,
		mid.map((v) => v * (R + angle / Math.PI + elevation)) as Vec3,
		b.map((v) => v * (R + elevation)) as Vec3
	];
}

export function arcPoint(controls: [Vec3, Vec3, Vec3], t: number): Vec3 {
	const [a, m, b] = controls,
		u = 1 - t;
	return a.map((v, i) => u * u * v + 2 * u * t * m[i] + t * t * b[i]) as Vec3;
}

export function sampleArc(arc: Pick<Arc, 'from' | 'to'>, elevation = 0): Vec3[] {
	const controls = arcControls(arc, elevation);
	return Array.from({ length: 33 }, (_, i) => arcPoint(controls, i / 32));
}

export function projectPoint(p: Vec3, view: View) {
	const cp = Math.cos(view.phi),
		sp = Math.sin(view.phi);
	const ct = Math.cos(view.theta),
		st = Math.sin(view.theta);
	const x = cp * p[0] + sp * p[2];
	const y = sp * st * p[0] + ct * p[1] - cp * st * p[2];
	const depth = -sp * ct * p[0] + st * p[1] + cp * ct * p[2];
	const radial = Math.hypot(x, y),
		scale = view.scale ?? 1;
	return {
		x: view.width / 2 + ((x * view.height) / 2) * scale + ((view.offset?.[0] ?? 0) * scale) / 2,
		y: view.height / 2 - ((y * view.height) / 2) * scale + ((view.offset?.[1] ?? 0) * scale) / 2,
		depth,
		radial,
		visible: depth >= 0 || radial >= R
	};
}

/** Clip each rendered segment using the shader's interpolated depth, radius and trail interval. */
export function projectSegments(
	points: Vec3[],
	view: View,
	arc: Pick<Arc, 'progress' | 'trailLength'>
): Segment[] {
	const trail = arc.trailLength ?? 0,
		head = arc.progress ?? 0;
	const low = trail > 0.001 ? Math.max(0, head - trail) : 0;
	const high = trail > 0.001 ? Math.min(1, head) : 1;
	if (high <= low) return [];
	const projected = points.map((p) => projectPoint(p, view));
	const result: Segment[] = [];
	const count = points.length - 1;
	for (let i = 0; i < count; i++) {
		const a = projected[i],
			b = projected[i + 1];
		const lo = Math.max(0, low * count - i),
			hi = Math.min(1, high * count - i);
		if (hi <= lo) continue;
		const cuts = [lo, hi];
		for (const [start, end, boundary] of [
			[a.depth, b.depth, 0],
			[a.radial, b.radial, R]
		]) {
			const cross = (boundary - start) / (end - start);
			if (cross > lo && cross < hi) cuts.push(cross);
		}
		cuts.sort((a, b) => a - b);
		const at = (t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
		for (let j = 1; j < cuts.length; j++) {
			const t = (cuts[j - 1] + cuts[j]) / 2;
			if (a.depth + (b.depth - a.depth) * t < 0 && a.radial + (b.radial - a.radial) * t < R)
				continue;
			result.push({ a: at(cuts[j - 1]), b: at(cuts[j]) });
		}
	}
	return result;
}

export function segmentDistance(p: Point, { a, b }: Segment): number {
	const dx = b.x - a.x,
		dy = b.y - a.y,
		length = dx * dx + dy * dy;
	const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
	return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

export function pickRoute(
	routes: ProjectedRoute[],
	p: Point,
	current: string | null = null,
	tolerance = 6
): string | null {
	let best: string | null = null,
		distance = tolerance;
	for (const route of routes) {
		let d = Infinity;
		for (const segment of route.segments) d = Math.min(d, segmentDistance(p, segment));
		if (route.id === current && d <= 8) return current;
		if (d <= distance) {
			distance = d;
			best = route.id;
		}
	}
	return best;
}
