export interface RouteEndpoint {
	code: string;
	city?: string;
}
export interface RouteSummary {
	id: string;
	from: RouteEndpoint;
	to: RouteEndpoint;
	distance: number;
	count: number;
}
interface Input {
	from: [number, number];
	to: [number, number];
	fromIata: string;
	toIata: string;
	distance: number;
}

/** Input order is preserved in routeIds, independently of the chronological playback order. */
export function summarizeRoutes(flights: Input[], airports: { iata: string; city: string }[]) {
	const cities = new Map(airports.map((a) => [a.iata, a.city]));
	const routes = new Map<string, RouteSummary>();
	const routeIds = flights.map((flight) => {
		const endpoints = [
			{ key: JSON.stringify([flight.fromIata, ...flight.from]), code: flight.fromIata },
			{ key: JSON.stringify([flight.toIata, ...flight.to]), code: flight.toIata }
		].sort((a, b) => a.key.localeCompare(b.key));
		const id = JSON.stringify(endpoints.map((e) => e.key));
		const existing = routes.get(id);
		if (existing) existing.count++;
		else
			routes.set(id, {
				id,
				from: { code: endpoints[0].code, city: cities.get(endpoints[0].code) },
				to: { code: endpoints[1].code, city: cities.get(endpoints[1].code) },
				distance: flight.distance,
				count: 1
			});
		return id;
	});
	return { routeSummaries: [...routes.values()], routeIds };
}
