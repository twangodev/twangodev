import type { Arc as GlobeArc } from '$lib/globe/projection';

type FetchLike = typeof fetch;

export interface RawFlightArc {
	startLat: number;
	startLng: number;
	endLat: number;
	endLng: number;
	fromIata?: string;
	toIata?: string;
	date?: string;
	flightNumber?: string;
	depUtc?: string;
	arrUtc?: string;
}

export interface RawAirport {
	lat: number;
	lng: number;
	iata: string;
	icao?: string;
	city: string;
	subd?: string;
	country: string;
	name: string;
	count: number;
}

export interface FlightMarker {
	location: [number, number];
	size: number;
	id: string;
}

export interface FlightAirport {
	location: [number, number];
	iata: string;
	city: string;
	subd?: string;
	country: string;
	name: string;
	count: number;
}

export interface FlightRoute {
	id: string;
	order: number;
	from: [number, number];
	to: [number, number];
	fromIata: string;
	toIata: string;
	flightNumber?: string;
	date: string;
	depUtc?: string;
	arrUtc?: string;
	depMs: number;
	arrMs: number;
	durationMs: number;
	distance: number;
	estimatedArrival: boolean;
}

export interface FlightLogData {
	arcs: RawFlightArc[];
	airports: RawAirport[];
}

export interface FlightMapModel {
	arcs: GlobeArc[];
	markers: FlightMarker[];
	airports: FlightAirport[];
	flights: FlightRoute[];
	bioDetails: { label: string; value: string; annotation?: string }[];
	totalMiles: number;
}

const EARTH_RADIUS_MILES = 3959;
const EARTH_CIRCUMFERENCE_MILES = 24901;
const AVG_FLIGHT_SPEED_MPH = 500;
const MIN_ESTIMATED_DURATION_MS = 45 * 60 * 1000;

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

export async function loadFlightLog(fetchFn: FetchLike): Promise<FlightLogData> {
	const res = await fetchFn('/globe-arcs.json');
	return res.json();
}

function parseDateMs(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? ms : undefined;
}

function estimateDurationMs(distance: number): number {
	return Math.max(MIN_ESTIMATED_DURATION_MS, (distance / AVG_FLIGHT_SPEED_MPH) * 60 * 60 * 1000);
}

export function buildFlightMapModel(data: FlightLogData): FlightMapModel {
	const arcs: GlobeArc[] = data.arcs.map((a) => ({
		from: [a.startLat, a.startLng],
		to: [a.endLat, a.endLng]
	}));

	const maxCount = Math.max(...data.airports.map((a) => a.count), 1);
	const markers: FlightMarker[] = data.airports.map((a) => ({
		location: [a.lat, a.lng],
		size: 0.008 + 0.02 * (a.count / maxCount),
		id: a.iata.toLowerCase()
	}));

	const airports: FlightAirport[] = data.airports
		.map((a) => ({
			location: [a.lat, a.lng] as [number, number],
			iata: a.iata,
			city: a.city,
			subd: a.subd,
			country: a.country,
			name: a.name,
			count: a.count
		}))
		.sort((a, b) => b.count - a.count);

	const routes = data.arcs.map((a, i) => {
		const distance = haversine(a.startLat, a.startLng, a.endLat, a.endLng);
		const depMs = parseDateMs(a.depUtc) ?? parseDateMs(a.date) ?? i;
		const parsedArrMs = parseDateMs(a.arrUtc);
		const arrMs = parsedArrMs ?? depMs + estimateDurationMs(distance);
		return {
			id: `flight-${i}-${(a.fromIata ?? 'from').toLowerCase()}-${(a.toIata ?? 'to').toLowerCase()}`,
			order: i,
			from: [a.startLat, a.startLng] as [number, number],
			to: [a.endLat, a.endLng] as [number, number],
			fromIata: a.fromIata ?? '???',
			toIata: a.toIata ?? '???',
			flightNumber: a.flightNumber,
			date: a.date ?? a.depUtc ?? '',
			depUtc: a.depUtc,
			arrUtc: a.arrUtc,
			depMs,
			arrMs,
			durationMs: Math.max(1, arrMs - depMs),
			distance,
			estimatedArrival: parsedArrMs === undefined
		} satisfies FlightRoute;
	});

	const flights = routes
		.toSorted((a, b) => a.depMs - b.depMs || a.order - b.order)
		.map((route, order) => ({
			...route,
			id: `flight-${order}-${route.fromIata.toLowerCase()}-${route.toIata.toLowerCase()}`,
			order
		}));

	const totalMiles = routes.reduce((sum, route) => sum + route.distance, 0);
	const longest = routes.reduce((a, b) => (b.distance > a.distance ? b : a));
	const shortest = routes.reduce((a, b) => (b.distance < a.distance ? b : a));
	const topAirports = airports.slice(0, 3).map((a) => a.iata);
	const timesAroundEarth = totalMiles / EARTH_CIRCUMFERENCE_MILES;

	const bioDetails = [
		{ label: 'flights', value: data.arcs.length.toLocaleString() },
		{
			label: 'distance',
			value: `${Math.round(totalMiles).toLocaleString()} mi`,
			annotation: `${Math.round(timesAroundEarth * 10) / 10}x around earth`
		},
		{ label: 'airports', value: `${data.airports.length}` },
		{ label: 'most visited', value: topAirports.join(', ') },
		{
			label: 'longest',
			value: `${Math.round(longest.distance).toLocaleString()} mi`,
			annotation: `${longest.fromIata}-${longest.toIata}`
		},
		{
			label: 'shortest',
			value: `${Math.round(shortest.distance).toLocaleString()} mi`,
			annotation: `${shortest.fromIata}-${shortest.toIata}`
		}
	];

	return { arcs, markers, airports, flights, bioDetails, totalMiles };
}
