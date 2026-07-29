import { describe, expect, it, vi } from 'vitest';
import { getLatestPostGitTimestamp } from './git-dates';

describe('getLatestPostGitTimestamp', () => {
	it('reads the newest author timestamp while following renames', () => {
		const exec = vi.fn(() => '2026-06-29T11:37:27-07:00\n');

		expect(
			getLatestPostGitTimestamp('/repo', 'src/content/writing/jetplay.svx', exec as never)
		).toBe('2026-06-29T11:37:27-07:00');
		expect(exec).toHaveBeenCalledWith(
			'git',
			['log', '-1', '--follow', '--format=%aI', '--', 'src/content/writing/jetplay.svx'],
			{
				cwd: '/repo',
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore']
			}
		);
	});

	it('returns no timestamp when the post is untracked or Git is unavailable', () => {
		const noHistory = vi.fn(() => '\n');
		const failed = vi.fn(() => {
			throw new Error('not a Git repository');
		});

		expect(getLatestPostGitTimestamp('/repo', 'draft.svx', noHistory as never)).toBeUndefined();
		expect(getLatestPostGitTimestamp('/repo', 'draft.svx', failed as never)).toBeUndefined();
	});
});
