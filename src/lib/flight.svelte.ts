export type Arc = {
	fromIata?: string;
	toIata?: string;
	depUtc?: string;
	arrUtc?: string;
	flightNumber?: string;
	startLat: number;
	startLng: number;
	endLat: number;
	endLng: number;
};

export type FlightStatus =
	| { kind: 'flying'; arc: Arc; depMs: number; arrMs: number; pct: number }
	| {
			kind: 'layover';
			landedArc: Arc;
			nextArc: Arc;
			landedArrMs: number;
			nextDepMs: number;
	  }
	| { kind: 'upcoming'; arc: Arc; depMs: number; arrMs: number }
	| null;

const HORIZON_MS = 24 * 60 * 60 * 1000;
const MAX_LAYOVER_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 1_000;

class FlightTracker {
	arcs = $state<Arc[]>([]);
	now = $state(Date.now());

	#started = false;

	start(): () => void {
		if (typeof window === 'undefined' || this.#started) return () => {};
		this.#started = true;
		void this.#load();
		const tick = setInterval(() => (this.now = Date.now()), TICK_MS);
		return () => {
			clearInterval(tick);
			this.#started = false;
		};
	}

	async #load(): Promise<void> {
		try {
			const res = await fetch('/globe-arcs.json');
			const data = await res.json();
			this.arcs = data.arcs ?? [];
		} catch {
			// best-effort; consumers render fallback state
		}
	}

	get status(): FlightStatus {
		let next: { arc: Arc; depMs: number; arrMs: number } | null = null;
		for (const a of this.arcs) {
			if (!a.depUtc || !a.arrUtc) continue;
			const depMs = Date.parse(a.depUtc);
			const arrMs = Date.parse(a.arrUtc);
			if (!Number.isFinite(depMs) || !Number.isFinite(arrMs)) continue;
			if (this.now > arrMs) continue;
			if (!next || depMs < next.depMs) next = { arc: a, depMs, arrMs };
		}
		if (!next) return null;

		if (this.now >= next.depMs && this.now <= next.arrMs) {
			const { arc, depMs, arrMs } = next;
			const pct = Math.min(100, Math.max(0, ((this.now - depMs) / (arrMs - depMs)) * 100));
			return { kind: 'flying', arc, depMs, arrMs, pct };
		}

		if (next.depMs - this.now > HORIZON_MS) return null;

		let landed: { arc: Arc; arrMs: number } | null = null;
		for (const a of this.arcs) {
			if (!a.arrUtc) continue;
			const arrMs = Date.parse(a.arrUtc);
			if (!Number.isFinite(arrMs) || arrMs > this.now) continue;
			if (!landed || arrMs > landed.arrMs) landed = { arc: a, arrMs };
		}
		if (
			landed &&
			landed.arc.toIata &&
			landed.arc.toIata === next.arc.fromIata &&
			next.depMs - landed.arrMs <= MAX_LAYOVER_MS
		) {
			return {
				kind: 'layover',
				landedArc: landed.arc,
				nextArc: next.arc,
				landedArrMs: landed.arrMs,
				nextDepMs: next.depMs
			};
		}

		return { kind: 'upcoming', arc: next.arc, depMs: next.depMs, arrMs: next.arrMs };
	}
}

export const flight = new FlightTracker();