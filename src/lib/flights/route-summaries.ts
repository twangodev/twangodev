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
	bidirectional: boolean;
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
	const origins = new Map<string, string>();
	const routeIds = flights.map((flight) => {
		const endpoints = [
			{ key: JSON.stringify([flight.fromIata, ...flight.from]), code: flight.fromIata },
			{ key: JSON.stringify([flight.toIata, ...flight.to]), code: flight.toIata }
		];
		const id = JSON.stringify(endpoints.map((e) => e.key).sort((a, b) => a.localeCompare(b)));
		const existing = routes.get(id);
		if (existing) {
			existing.count++;
			existing.bidirectional ||= origins.get(id) !== endpoints[0].key;
		} else {
			origins.set(id, endpoints[0].key);
			routes.set(id, {
				id,
				from: { code: endpoints[0].code, city: cities.get(endpoints[0].code) },
				to: { code: endpoints[1].code, city: cities.get(endpoints[1].code) },
				distance: flight.distance,
				count: 1,
				bidirectional: false
			});
		}
		return id;
	});
	return { routeSummaries: [...routes.values()], routeIds };
}
