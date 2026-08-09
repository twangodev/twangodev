import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
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
