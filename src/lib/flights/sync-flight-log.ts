import { execFileSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** The gitignored flight log, co-located with the code that imports it. */
const FLIGHT_LOG_PATH = fileURLToPath(new URL('./globe-arcs.json', import.meta.url));
// Matches the CI rebuild cadence; a fresher file is never regenerated.
const FLIGHT_LOG_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/**
 * Regenerates the flight log before anything imports it. Needs
 * FLIGHT_RADAR_USERNAME and uv; without them an existing file is used as-is,
 * and only a missing file is a hard error.
 */
export function syncFlightLog(): Plugin {
	return {
		name: 'sync-flight-log',
		buildStart() {
			const warn = (message: string) => {
				this.warn(message);
				if (process.env.GITHUB_ACTIONS === 'true') {
					console.log(`::warning title=Flight log refresh::${message}`);
				}
			};
			const fresh =
				existsSync(FLIGHT_LOG_PATH) &&
				Date.now() - statSync(FLIGHT_LOG_PATH).mtimeMs < FLIGHT_LOG_MAX_AGE_MS;
			if (fresh) return;

			const username = process.env.FLIGHT_RADAR_USERNAME;
			if (username) {
				const temporaryPath = `${FLIGHT_LOG_PATH}.tmp`;
				try {
					execFileSync('uvx', ['mfr24', 'export', username, '-o', temporaryPath], {
						stdio: 'inherit',
						timeout: 180_000
					});
					renameSync(temporaryPath, FLIGHT_LOG_PATH);
					return;
				} catch {
					if (existsSync(FLIGHT_LOG_PATH)) {
						warn(
							'Flight log export failed; using the last successful export. Flight data may be outdated. See the exporter output above for the cause.'
						);
					}
				} finally {
					rmSync(temporaryPath, { force: true });
				}
			}

			if (!existsSync(FLIGHT_LOG_PATH)) {
				throw new Error(
					`${FLIGHT_LOG_PATH} is missing and could not be generated. ` +
						'Set FLIGHT_RADAR_USERNAME (and install uv) or provide the file manually.'
				);
			}
			if (!username) {
				warn('FLIGHT_RADAR_USERNAME is not set; using the last successful flight export as-is.');
			}
		}
	};
}
