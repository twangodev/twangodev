import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncFlightLog } from './src/lib/flights/sync-flight-log';
import { getPostGitDates } from './src/lib/writing/git-dates';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

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

function getJetplayDownloads(): number {
	// Fetched at build time from the JetBrains Marketplace API and inlined via `define`.
	// Falls back to the last-known count when the network is unavailable at build.
	const fallback = 2395;
	try {
		const json = execSync('curl -fsSL https://plugins.jetbrains.com/api/plugins/31014', {
			encoding: 'utf-8',
			timeout: 5000
		});
		const downloads = JSON.parse(json).downloads;
		return typeof downloads === 'number' ? downloads : fallback;
	} catch {
		return fallback;
	}
}

const jetplayDownloads = getJetplayDownloads();
const postGitDates = getPostGitDates(repositoryRoot);

export default defineConfig({
	define: {
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		__COMMIT_HASH__: JSON.stringify(getCommitHash()),
		__POST_GIT_DATES__: JSON.stringify(postGitDates),
		__JETPLAY_DOWNLOADS__: JSON.stringify(jetplayDownloads)
	},
	plugins: [syncFlightLog(), buildWorkspaces(), tailwindcss(), sveltekit(), devtoolsJson()],
	server: {
		fs: {
			allow: ['packages']
		}
	}
});
