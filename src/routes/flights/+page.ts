import type { Arc } from '$lib/globe/projection';

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

	return { bioExpanded: true, arcs, markers, airports };
};
