import type { Arc } from '$lib/globe/projection';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 3959; // Earth radius in miles
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(a));
}

export const load = async ({ fetch }) => {
	const res = await fetch('/globe-arcs.json');
	const data: {
		arcs: { startLat: number; startLng: number; endLat: number; endLng: number }[];
		airports: { lat: number; lng: number; iata: string; count: number }[];
	} = await res.json();

	const arcs: Arc[] = data.arcs.map((a) => ({
		from: [a.startLat, a.startLng],
		to: [a.endLat, a.endLng]
	}));

	const maxCount = Math.max(...data.airports.map((a) => a.count));
	const markers = data.airports.map((a) => ({
		location: [a.lat, a.lng] as [number, number],
		size: 0.015 + 0.035 * (a.count / maxCount)
	}));

	const airports = data.airports
		.map((a) => ({
			location: [a.lat, a.lng] as [number, number],
			iata: a.iata,
			count: a.count
		}))
		.sort((a, b) => b.count - a.count);

	// Compute flight stats
	const totalMiles = data.arcs.reduce(
		(sum, a) => sum + haversine(a.startLat, a.startLng, a.endLat, a.endLng),
		0
	);

	// Build coordinate → IATA lookup
	const iataByCoord = new Map<string, string>();
	for (const a of data.airports) {
		iataByCoord.set(`${a.lat},${a.lng}`, a.iata);
	}

	const arcsWithDistance = data.arcs.map((a) => ({
		distance: haversine(a.startLat, a.startLng, a.endLat, a.endLng),
		from: iataByCoord.get(`${a.startLat},${a.startLng}`) ?? '???',
		to: iataByCoord.get(`${a.endLat},${a.endLng}`) ?? '???'
	}));

	const longest = arcsWithDistance.reduce((a, b) => (b.distance > a.distance ? b : a));
	const shortest = arcsWithDistance.reduce((a, b) => (b.distance < a.distance ? b : a));

	const EARTH_CIRCUMFERENCE = 24901;
	const timesAroundEarth = totalMiles / EARTH_CIRCUMFERENCE;

	const topAirports = airports.slice(0, 3).map((a) => a.iata);

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
			annotation: `${longest.from}-${longest.to}`
		},
		{
			label: 'shortest',
			value: `${Math.round(shortest.distance).toLocaleString()} mi`,
			annotation: `${shortest.from}-${shortest.to}`
		}
	];

	return {
		bioExpanded: true,
		bioHeading: 'Logbook',
		bioDescription: "collected statistics about (most) of the flights i've taken.",
		bioDetails,
		arcs,
		markers,
		airports
	};
};
