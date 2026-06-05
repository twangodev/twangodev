import { describe, it, expect } from 'vitest';
import { markdownTable } from './agent-table';

describe('markdownTable', () => {
	it('renders a GitHub-flavored markdown table', () => {
		const t = markdownTable(
			['Dataset', 'WER'],
			[
				['AMI', 8.13],
				['LS Clean', 1.25]
			]
		);
		expect(t).toBe(
			['| Dataset | WER |', '| --- | --- |', '| AMI | 8.13 |', '| LS Clean | 1.25 |'].join('\n')
		);
	});

	it('escapes pipe characters in cells', () => {
		const t = markdownTable(['A'], [['x | y']]);
		expect(t).toContain('| x \\| y |');
	});
});
