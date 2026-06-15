import { buildFlightMapModel, loadFlightLog } from '$lib/flights/data';

export const load = async ({ fetch }) => {
	const model = buildFlightMapModel(await loadFlightLog(fetch));

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
