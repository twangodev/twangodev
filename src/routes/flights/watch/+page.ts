import { buildFlightMapModel, loadFlightLog } from '$lib/flights/data';

export const load = async ({ fetch }) => {
	const model = buildFlightMapModel(await loadFlightLog(fetch));
	const first = model.flights[0];
	const last = model.flights.at(-1);
	const airportByIata = new Map(model.airports.map((airport) => [airport.iata, airport]));
	const firstFrom = first ? airportByIata.get(first.fromIata) : undefined;
	const firstTo = first ? airportByIata.get(first.toIata) : undefined;

	return {
		bioExpanded: true,
		bioHeadingRoute: first ? { from: first.fromIata, to: first.toIata } : undefined,
		bioDescription:
			firstFrom && firstTo
				? `${firstFrom.name} to ${firstTo.name}.`
				: 'a chronological playback of the flight log.',
		bioHandwriting: ['replay', 'seatbelt sign', 'boarding'],
		bioDetails: [
			{ label: 'flights', value: model.flights.length.toLocaleString() },
			{
				label: 'distance',
				value: `${Math.round(model.totalMiles).toLocaleString()} mi`
			},
			{
				label: 'range',
				value: first && last ? `${first.date.slice(0, 4)}-${last.date.slice(0, 4)}` : 'unknown'
			},
			{
				label: 'mode',
				value: 'playback'
			}
		],
		flights: model.flights,
		markers: model.markers,
		airports: model.airports,
		totalMiles: model.totalMiles
	};
};
