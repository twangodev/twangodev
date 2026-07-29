import { describe, expect, it } from 'vitest';
import { formatPostDate, resolvePostUpdatedDate } from './dates';

describe('resolvePostUpdatedDate', () => {
	it('uses a later Git author date', () => {
		expect(resolvePostUpdatedDate('2026-06-16', '2026-06-29T11:37:27-07:00')).toBe('2026-06-29');
	});

	it('hides updates made on the publication date', () => {
		expect(resolvePostUpdatedDate('2026-06-05', '2026-06-05T19:23:08-07:00')).toBeUndefined();
	});

	it('hides Git history older than the editorial publication date', () => {
		expect(resolvePostUpdatedDate('2026-06-04', '2026-04-19T17:18:31-07:00')).toBeUndefined();
	});

	it('falls back to valid frontmatter when Git history is unavailable', () => {
		expect(resolvePostUpdatedDate('2026-06-04', undefined, '2026-06-10')).toBe('2026-06-10');
	});

	it('ignores missing or invalid dates', () => {
		expect(resolvePostUpdatedDate('2026-06-04')).toBeUndefined();
		expect(resolvePostUpdatedDate('2026-06-04', 'not-a-date')).toBeUndefined();
		expect(resolvePostUpdatedDate('2026-02-30', '2026-03-01')).toBeUndefined();
	});
});

describe('formatPostDate', () => {
	it('formats a date-only value without a local timezone shift', () => {
		expect(formatPostDate('2026-06-16')).toBe('June 16, 2026');
		expect(formatPostDate('2026-06-16', 'short')).toBe('Jun 16, 2026');
	});
});
