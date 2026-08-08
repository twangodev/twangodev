import { buildFlightMapModel, flightLog } from '$lib/flights/data';

export const load = () => {
	const model = buildFlightMapModel(flightLog);

	return {
		bioExpanded: true,
		bioHeading: 'Routes',
		bioDescription: "all the routes i've flown.",
		bioHandwriting: ['the scenic route', 'point a to point b', 'flight paths'],
		bioDetails: model.bioDetails,
		arcs: model.arcs,
		markers: model.markers,
		airports: model.airports
	};
};
