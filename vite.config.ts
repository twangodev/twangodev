import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { format } from 'timeago.js';

function buildWorkspaces(): Plugin {
	return {
		name: 'build-workspaces',
		buildStart() {
			execSync('bun run --filter "cobe" build', { stdio: 'inherit' });
		}
	};
}

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
		const now = Date.now();

		type Arc = {
			date?: string;
			depUtc?: string;
			arrUtc?: string;
			startLat: number;
			startLng: number;
			endLat: number;
			endLng: number;
		};
		type Airport = { lat: number; lng: number; iata: string; city: string; subd?: string };

		const timed = data.arcs.filter((a: Arc) => a.depUtc && a.arrUtc);
		const landed = timed
			.filter((a: Arc) => Date.parse(a.arrUtc!) <= now)
			.sort((a: Arc, b: Arc) => Date.parse(b.arrUtc!) - Date.parse(a.arrUtc!));
		const upcoming = timed
			.filter((a: Arc) => Date.parse(a.depUtc!) > now)
			.sort((a: Arc, b: Arc) => Date.parse(a.depUtc!) - Date.parse(b.depUtc!));

		const latest: Arc | undefined = landed[0];
		if (!latest) return { location: 'unknown', info: '' };

		const findAirport = (lat: number, lng: number): Airport | undefined =>
			data.airports.find((a: Airport) => a.lat === lat && a.lng === lng);

		const dest = findAirport(latest.endLat, latest.endLng);
		if (!dest) return { location: 'unknown', info: '' };

		const city = dest.city?.toLowerCase() ?? 'unknown';
		const subd = dest.subd?.toLowerCase();
		const location = subd ? `${city}, ${subd}` : city;

		const parts: string[] = [];
		parts.push(`flew into ${dest.iata} ${format(latest.arrUtc!)}`);

		const next: Arc | undefined = upcoming[0];
		if (next) {
			const nextDest = findAirport(next.endLat, next.endLng);
			if (nextDest) {
				parts.push(`next flight to ${nextDest.iata} ${format(next.depUtc!)}`);
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
	plugins: [buildWorkspaces(), tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		fs: {
			allow: ['packages']
		}
	}
});
