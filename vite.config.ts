import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const FLIGHT_LOG_PATH = 'src/lib/flights/globe-arcs.json';
// Matches the CI rebuild cadence; a fresher file is never regenerated.
const FLIGHT_LOG_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/**
 * Regenerates the (gitignored) flight log before anything imports it. Needs
 * FLIGHT_RADAR_USERNAME and uv; without them an existing file is used as-is,
 * and only a missing file is a hard error.
 */
function syncFlightLog(): Plugin {
	return {
		name: 'sync-flight-log',
		buildStart() {
			const fresh =
				existsSync(FLIGHT_LOG_PATH) &&
				Date.now() - statSync(FLIGHT_LOG_PATH).mtimeMs < FLIGHT_LOG_MAX_AGE_MS;
			if (fresh) return;

			const username = process.env.FLIGHT_RADAR_USERNAME;
			if (username) {
				try {
					execFileSync('uvx', ['mfr24', 'export', username, '-o', FLIGHT_LOG_PATH], {
						stdio: 'inherit',
						timeout: 180_000
					});
					return;
				} catch {
					this.warn(`flight log export failed; falling back to the existing ${FLIGHT_LOG_PATH}`);
				}
			}

			if (!existsSync(FLIGHT_LOG_PATH)) {
				throw new Error(
					`${FLIGHT_LOG_PATH} is missing and could not be generated. ` +
						'Set FLIGHT_RADAR_USERNAME (and install uv) or provide the file manually.'
				);
			}
			if (!username) {
				this.warn(`FLIGHT_RADAR_USERNAME is not set; using the existing ${FLIGHT_LOG_PATH} as-is`);
			}
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
