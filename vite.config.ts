import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { format } from 'timeago.js';

function getCommitHash(): string {
	try {
		return execSync('git rev-parse --short HEAD').toString().trim();
	} catch {
		return '';
	}
}

interface FlightLocation {
	location: string;
	info: string;
}

function getFlightLocation(): FlightLocation {
	try {
		const data = JSON.parse(readFileSync('static/globe-arcs.json', 'utf-8'));
		const now = new Date().toISOString().slice(0, 10);

		type Arc = {
			date?: string;
			startLat: number;
			startLng: number;
			endLat: number;
			endLng: number;
		};
		type Airport = { lat: number; lng: number; iata: string; city: string; subd?: string };

		const dated = data.arcs.filter((a: Arc) => a.date);
		const past = dated
			.filter((a: Arc) => a.date! <= now)
			.sort((a: Arc, b: Arc) => b.date!.localeCompare(a.date!));
		const future = dated
			.filter((a: Arc) => a.date! > now)
			.sort((a: Arc, b: Arc) => a.date!.localeCompare(b.date!));

		const latest: Arc | undefined = past[0];
		if (!latest) return { location: 'unknown', info: '' };

		const findAirport = (lat: number, lng: number): Airport | undefined =>
			data.airports.find((a: Airport) => a.lat === lat && a.lng === lng);

		const dest = findAirport(latest.endLat, latest.endLng);
		if (!dest) return { location: 'unknown', info: '' };

		const city = dest.city?.toLowerCase() ?? 'unknown';
		const subd = dest.subd?.toLowerCase();
		const location = subd ? `${city}, ${subd}` : city;

		const parts: string[] = [];
		const now_ = new Date();
		parts.push(`flew into ${dest.iata} ${format(latest.date!, now_)}`);

		const next: Arc | undefined = future[0];
		if (next) {
			const nextDest = findAirport(next.endLat, next.endLng);
			if (nextDest) {
				parts.push(`next flight to ${nextDest.iata} ${format(next.date!, now_)}`);
			}
		}

		return { location, info: parts.join('. ') };
	} catch {
		return { location: 'unknown', info: '' };
	}
}

const flightLocation = getFlightLocation();

export default defineConfig({
	define: {
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		__COMMIT_HASH__: JSON.stringify(getCommitHash()),
		__CURRENT_LOCATION__: JSON.stringify(flightLocation.location),
		__LOCATION_INFO__: JSON.stringify(flightLocation.info)
	},
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		fs: {
			allow: ['packages']
		}
	}
});
