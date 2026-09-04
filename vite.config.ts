import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncFlightLog } from './src/lib/flights/sync-flight-log';
import {
	jetplayDailyDownloadsUrl,
	parseMarketplaceDownloadSeries,
	type MarketplaceDownloadPoint
} from './src/lib/jetbrains/marketplace-downloads';
import {
	LIBRIVOX_ACTIVITY_FALLBACK,
	type LibrivoxActivitySnapshot
} from './src/lib/librivox/activity';
import { fetchLibrivoxActivity } from './src/lib/librivox/hugging-face';
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

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch(url, { ...init, signal: controller.signal });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} finally {
		clearTimeout(timeout);
	}
}

async function getLibrivoxActivity(): Promise<LibrivoxActivitySnapshot> {
	// Read two Parquet columns plus the small sync summary; the browser receives aggregate data only.
	try {
		return await fetchLibrivoxActivity();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Unable to fetch LibriVox activity: ${message}`);
		return LIBRIVOX_ACTIVITY_FALLBACK;
	}
}

async function getJetplayDownloads(): Promise<number> {
	// Fetched at build time from the JetBrains Marketplace API and inlined via `define`.
	// Falls back to the last-known count when the network is unavailable at build.
	const fallback = 8477;
	try {
		const json = (await fetchJson('https://plugins.jetbrains.com/api/plugins/31014')) as {
			downloads?: unknown;
		};
		const downloads = json.downloads;
		return typeof downloads === 'number' ? downloads : fallback;
	} catch {
		return fallback;
	}
}

async function getJetplayDownloadSeries(token?: string): Promise<MarketplaceDownloadPoint[]> {
	token = token?.trim();
	if (!token) return [];

	try {
		const json = await fetchJson(jetplayDailyDownloadsUrl(), {
			headers: { Authorization: `Bearer ${token}` }
		});
		return parseMarketplaceDownloadSeries(json);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Unable to fetch Jetplay download history: ${message}`);
		return [];
	}
}

const postGitDates = getPostGitDates(repositoryRoot);

export default defineConfig(async ({ mode }) => {
	const env = loadEnv(mode, repositoryRoot, 'JETBRAINS_');
	const [jetplayDownloads, jetplayDownloadSeries, librivoxActivity] = await Promise.all([
		getJetplayDownloads(),
		getJetplayDownloadSeries(env.JETBRAINS_MARKETPLACE_TOKEN),
		getLibrivoxActivity()
	]);

	return {
		define: {
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__COMMIT_HASH__: JSON.stringify(getCommitHash()),
			__POST_GIT_DATES__: JSON.stringify(postGitDates),
			__JETPLAY_DOWNLOADS__: JSON.stringify(jetplayDownloads),
			__JETPLAY_DOWNLOAD_SERIES__: JSON.stringify(jetplayDownloadSeries),
			__LIBRIVOX_ACTIVITY__: JSON.stringify(librivoxActivity)
		},
		plugins: [syncFlightLog(), buildWorkspaces(), tailwindcss(), sveltekit(), devtoolsJson()],
		server: {
			fs: {
				allow: ['packages']
			}
		}
	};
});
