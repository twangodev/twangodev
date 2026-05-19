import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import {
	findAirport,
	findLatestLanded,
	findNextUpcoming,
	formatCityLabel,
	formatLocationInfo
} from './src/lib/flight-location';

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

function getFlightLocation(): { location: string; info: string } {
	try {
		const data = JSON.parse(readFileSync('static/globe-arcs.json', 'utf-8'));
		const now = Date.now();
		const arcs = data.arcs ?? [];
		const airports = data.airports ?? [];

		const landed = findLatestLanded(arcs, now);
		if (!landed) return { location: 'unknown', info: '' };

		const next = findNextUpcoming(arcs, now);
		const location = formatCityLabel(findAirport(airports, landed.arc.toIata)) ?? 'unknown';
		const info = formatLocationInfo(landed, next);
		return { location, info };
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
