import {
	type Airport,
	type Arc,
	findAirport,
	findLatestLanded,
	findNextUpcoming,
	formatCityLabel,
	formatLocationInfo
} from './flight-location';

export type { Airport, Arc };

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
	| {
			kind: 'at';
			landedArc: Arc;
			landedArrMs: number;
			nextArc?: Arc;
			nextDepMs?: number;
	  }
	| null;

declare const __CURRENT_LOCATION__: string;
declare const __LOCATION_INFO__: string;

const HORIZON_MS = 24 * 60 * 60 * 1000;
const MAX_LAYOVER_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 1_000;

class FlightTracker {
	arcs = $state<Arc[]>([]);
	airports = $state<Airport[]>([]);
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
			this.airports = data.airports ?? [];
		} catch {
			// best-effort; consumers render fallback state
		}
	}

	get status(): FlightStatus {
		if (this.arcs.length === 0) return null;

		const next = findNextUpcoming(this.arcs, this.now);
		const landed = findLatestLanded(this.arcs, this.now);

		if (next && this.now >= next.depMs && this.now <= next.arrMs) {
			const pct = Math.min(
				100,
				Math.max(0, ((this.now - next.depMs) / (next.arrMs - next.depMs)) * 100)
			);
			return { kind: 'flying', arc: next.arc, depMs: next.depMs, arrMs: next.arrMs, pct };
		}

		if (next && next.depMs - this.now <= HORIZON_MS) {
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

		if (landed) {
			return {
				kind: 'at',
				landedArc: landed.arc,
				landedArrMs: landed.arrMs,
				nextArc: next?.arc,
				nextDepMs: next?.depMs
			};
		}
		return null;
	}

	get location(): string {
		const s = this.status;
		if (!s) return __CURRENT_LOCATION__;
		if (s.kind === 'flying') return 'the cloud';

		const iata =
			s.kind === 'upcoming'
				? findLatestLanded(this.arcs, this.now)?.arc.toIata
				: s.landedArc.toIata;
		return formatCityLabel(findAirport(this.airports, iata)) ?? 'unknown';
	}

	get locationInfo(): string {
		const s = this.status;
		if (!s) return __LOCATION_INFO__;
		if (s.kind === 'flying') return 'high availability achieved';

		let landed: { arc: Arc; arrMs: number } | undefined;
		let next: { arc: Arc; depMs: number } | undefined;
		if (s.kind === 'layover') {
			landed = { arc: s.landedArc, arrMs: s.landedArrMs };
			next = { arc: s.nextArc, depMs: s.nextDepMs };
		} else if (s.kind === 'at') {
			landed = { arc: s.landedArc, arrMs: s.landedArrMs };
			next =
				s.nextArc && s.nextDepMs !== undefined ? { arc: s.nextArc, depMs: s.nextDepMs } : undefined;
		} else {
			landed = findLatestLanded(this.arcs, this.now);
			next = { arc: s.arc, depMs: s.depMs };
		}
		return formatLocationInfo(landed, next);
	}
}

export const flight = new FlightTracker();
