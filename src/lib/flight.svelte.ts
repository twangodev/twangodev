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
	| { kind: 'upcoming'; arc: Arc; depMs: number; arrMs: number }
	| null;

const HORIZON_MS = 24 * 60 * 60 * 1000;
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
		let best: { arc: Arc; depMs: number; arrMs: number } | null = null;
		for (const a of this.arcs) {
			if (!a.depUtc || !a.arrUtc) continue;
			const depMs = Date.parse(a.depUtc);
			const arrMs = Date.parse(a.arrUtc);
			if (!Number.isFinite(depMs) || !Number.isFinite(arrMs)) continue;
			if (this.now > arrMs) continue;
			if (!best || depMs < best.depMs) best = { arc: a, depMs, arrMs };
		}
		if (!best) return null;
		const { arc, depMs, arrMs } = best;
		if (this.now >= depMs && this.now <= arrMs) {
			const pct = Math.min(100, Math.max(0, ((this.now - depMs) / (arrMs - depMs)) * 100));
			return { kind: 'flying', arc, depMs, arrMs, pct };
		}
		if (depMs - this.now <= HORIZON_MS) {
			return { kind: 'upcoming', arc, depMs, arrMs };
		}
		return null;
	}
}

export const flight = new FlightTracker();