import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	statSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	renameSync: vi.fn(),
	rmSync: vi.fn()
}));

import { execFileSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, statSync } from 'node:fs';
import { syncFlightLog } from './sync-flight-log';

beforeEach(() => {
	vi.unstubAllGlobals();
	vi.resetAllMocks();
	vi.stubEnv('FLIGHT_RADAR_USERNAME', 'twango');
	vi.stubEnv('GITHUB_ACTIONS', 'true');
	vi.mocked(statSync).mockReturnValue({ mtimeMs: 0 } as ReturnType<typeof statSync>);
});

async function build() {
	const hook = syncFlightLog().buildStart as (...args: unknown[]) => unknown;
	const warn = vi.fn();
	await hook.call({ warn });
	return warn;
}

it('keeps the saved export and annotates Actions when refresh fails', async () => {
	vi.mocked(existsSync).mockReturnValue(true);
	vi.mocked(execFileSync).mockImplementation(() => {
		throw new Error('503');
	});
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});
	try {
		expect(await build()).toHaveBeenCalledWith(expect.stringContaining('last successful export'));
		expect(log).toHaveBeenCalledWith(
			expect.stringContaining('::warning title=Flight log refresh::')
		);
		expect(renameSync).not.toHaveBeenCalled();
		expect(rmSync).toHaveBeenCalledWith(expect.stringMatching(/\.tmp$/), { force: true });
	} finally {
		log.mockRestore();
	}
});

it('fails if refresh and deployed snapshot recovery fail with no saved export', async () => {
	vi.mocked(existsSync).mockReturnValue(false);
	vi.mocked(execFileSync).mockImplementation(() => {
		throw new Error('503');
	});
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
	await expect(build()).rejects.toThrow('missing and could not be generated');
});

it('replaces the saved export only after a successful refresh', async () => {
	vi.mocked(existsSync).mockReturnValue(true);
	expect(await build()).not.toHaveBeenCalled();
	expect(renameSync).toHaveBeenCalledWith(
		expect.stringMatching(/globe-arcs\.json\.tmp$/),
		expect.stringMatching(/globe-arcs\.json$/)
	);
});

it('recovers the snapshot from the deployed build on a cache miss', async () => {
	vi.mocked(existsSync).mockReturnValue(false);
	vi.mocked(execFileSync).mockImplementation(() => {
		throw new Error('503');
	});
	const snapshot = { arcs: [], airports: [] };
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
	expect(await build()).toHaveBeenCalledWith(expect.stringContaining('deployed build'));
});
