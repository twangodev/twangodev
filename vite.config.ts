import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

function getCommitHash(): string {
	try {
		return execSync('git rev-parse --short HEAD').toString().trim();
	} catch {
		return '';
	}
}

function getCurrentLocation(): string {
	try {
		const data = JSON.parse(readFileSync('static/globe-arcs.json', 'utf-8'));
		const now = new Date().toISOString().slice(0, 10);
		const latest = data.arcs
			.filter((a: { date?: string }) => a.date && a.date <= now)
			.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))[0];
		if (!latest) return 'unknown';
		const dest = data.airports.find(
			(a: { lat: number; lng: number }) => a.lat === latest.endLat && a.lng === latest.endLng
		);
		if (!dest) return 'unknown';
		const city = dest.city?.toLowerCase() ?? 'unknown';
		const subd = dest.subd?.toLowerCase();
		return subd ? `${city}, ${subd}` : city;
	} catch {
		return 'unknown';
	}
}

export default defineConfig({
	define: {
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		__COMMIT_HASH__: JSON.stringify(getCommitHash()),
		__CURRENT_LOCATION__: JSON.stringify(getCurrentLocation())
	},
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()]
});
