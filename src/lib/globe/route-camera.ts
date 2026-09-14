import type { Arc } from 'cobe';
import { projectPoint, sampleArc, type Point, type View } from './route-picking';

export interface RouteInspectorHandle {
	update: (view: View, arcs: Arc[]) => void;
	getView: (base: View, arcs: Arc[], now: number) => View;
	isPaused: () => boolean;
	clear: () => void;
}

/** Zoom about the acquisition point without changing the globe's orientation. */
export function focusRoute(
	arc: Pick<Arc, 'from' | 'to'>,
	base: View,
	pivot: Point = { x: base.width / 2, y: base.height / 2 }
): View {
	const points = sampleArc(arc)
		.map((point) => projectPoint(point, base))
		.filter((point) => point.visible);
	let zoom = 1.8;
	// Retain visible route geometry inside the feathered field where possible.
	// Routes already extending into the feather keep their existing framing.
	const paddingX = base.width * 0.06,
		paddingY = base.height * 0.06;
	for (const point of points) {
		const dx = point.x - pivot.x,
			dy = point.y - pivot.y;
		if (dx > 0) zoom = Math.min(zoom, (base.width - paddingX - pivot.x) / dx);
		if (dx < 0) zoom = Math.min(zoom, (paddingX - pivot.x) / dx);
		if (dy > 0) zoom = Math.min(zoom, (base.height - paddingY - pivot.y) / dy);
		if (dy < 0) zoom = Math.min(zoom, (paddingY - pivot.y) / dy);
	}
	zoom = Math.max(1, zoom);
	const scale = (base.scale ?? 1) * zoom;
	return {
		...base,
		scale,
		offset: [
			(base.offset?.[0] ?? 0) + ((base.width / 2 - pivot.x) * 2 * (zoom - 1)) / scale,
			(base.offset?.[1] ?? 0) + ((base.height / 2 - pivot.y) * 2 * (zoom - 1)) / scale
		]
	};
}

function angleBetween(from: number, to: number) {
	return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Stateful easing keeps route changes and the return to the original camera continuous. */
export class RouteCamera {
	private current: View | undefined;
	private from: View | undefined;
	private id: string | null = null;
	private started = 0;
	private moving = false;
	get active() {
		return this.id !== null || this.moving;
	}

	step(
		base: View,
		focus: { id: string; arc: Arc; pivot?: Point } | null,
		now: number,
		reducedMotion = false
	): View {
		const normal = {
			...base,
			scale: base.scale ?? 1,
			offset: base.offset ?? ([0, 0] as [number, number])
		};
		if (reducedMotion) {
			this.id = null;
			this.moving = false;
			this.current = normal;
			return normal;
		}
		this.current ??= normal;
		if ((focus?.id ?? null) !== this.id) {
			this.id = focus?.id ?? null;
			this.from = this.current;
			this.started = now;
			this.moving = true;
		}
		const target = focus ? focusRoute(focus.arc, normal, focus.pivot) : normal;
		if (!this.moving || !this.from) return (this.current = target);
		const t = Math.min(1, Math.max(0, (now - this.started) / 480));
		const ease = t * t * (3 - 2 * t);
		const mix = (a: number, b: number) => a + (b - a) * ease;
		this.current = {
			...base,
			phi: this.from.phi + angleBetween(this.from.phi, target.phi) * ease,
			theta: mix(this.from.theta, target.theta),
			scale: mix(this.from.scale ?? 1, target.scale ?? 1),
			offset: [
				mix(
					(this.from.offset?.[0] ?? 0) * (this.from.scale ?? 1),
					(target.offset?.[0] ?? 0) * (target.scale ?? 1)
				) / mix(this.from.scale ?? 1, target.scale ?? 1),
				mix(
					(this.from.offset?.[1] ?? 0) * (this.from.scale ?? 1),
					(target.offset?.[1] ?? 0) * (target.scale ?? 1)
				) / mix(this.from.scale ?? 1, target.scale ?? 1)
			]
		};
		if (t === 1) this.moving = false;
		return this.current;
	}
}
