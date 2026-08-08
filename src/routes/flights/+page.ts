import { buildFlightMapModel, flightLog } from '$lib/flights/data';

export const load = () => {
	const model = buildFlightMapModel(flightLog);

	return {
		bioExpanded: true,
		bioHeading: 'Logbook',
		bioDescription: "collected statistics about (most) of the flights i've taken.",
		bioHandwriting: ['weeeee', 'zoom zoom', 'whooosh'],
		bioDetails: model.bioDetails,
		arcs: model.arcs,
		markers: model.markers,
		airports: model.airports
	};
};
