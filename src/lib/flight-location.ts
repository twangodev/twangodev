import { format as timeago } from 'timeago.js';

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

export type Airport = {
	lat: number;
	lng: number;
	iata: string;
	city: string;
	subd?: string;
	country?: string;
	name?: string;
};

export type Landed = { arc: Arc; arrMs: number };
export type Upcoming = { arc: Arc; depMs: number; arrMs: number };

export function findLatestLanded(arcs: Arc[], now: number): Landed | undefined {
	let result: Landed | undefined;
	for (const a of arcs) {
		if (!a.arrUtc) continue;
		const arrMs = Date.parse(a.arrUtc);
		if (!Number.isFinite(arrMs) || arrMs > now) continue;
		if (!result || arrMs > result.arrMs) result = { arc: a, arrMs };
	}
	return result;
}

export function findNextUpcoming(arcs: Arc[], now: number): Upcoming | undefined {
	let result: Upcoming | undefined;
	for (const a of arcs) {
		if (!a.depUtc || !a.arrUtc) continue;
		const depMs = Date.parse(a.depUtc);
		const arrMs = Date.parse(a.arrUtc);
		if (!Number.isFinite(depMs) || !Number.isFinite(arrMs)) continue;
		if (now > arrMs) continue;
		if (!result || depMs < result.depMs) result = { arc: a, depMs, arrMs };
	}
	return result;
}

export function findAirport(airports: Airport[], iata: string | undefined): Airport | undefined {
	if (!iata) return undefined;
	return airports.find((a) => a.iata === iata);
}

export function formatCityLabel(airport: Airport | undefined): string | undefined {
	if (!airport) return undefined;
	const city = airport.city?.toLowerCase();
	if (!city) return undefined;
	const subd = airport.subd?.toLowerCase();
	return subd ? `${city}, ${subd}` : city;
}

export function formatLocationInfo(
	landed: { arc: Arc; arrMs: number } | undefined,
	next: { arc: Arc; depMs: number } | undefined
): string {
	const parts: string[] = [];
	if (landed?.arc.toIata) {
		parts.push(`flew into ${landed.arc.toIata} ${timeago(new Date(landed.arrMs))}`);
	}
	if (next?.arc.toIata) {
		parts.push(`next flight to ${next.arc.toIata} ${timeago(new Date(next.depMs))}`);
	}
	return parts.join('. ');
}
