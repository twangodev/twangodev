import { describe, it, expect } from 'vitest';
import { sentenceSpanAt } from './footnote-sentence';

const at = (text: string, index: number) => {
	const [start, end] = sentenceSpanAt(text, index);
	return text.slice(start, end);
};

describe('sentenceSpanAt', () => {
	it('returns the sentence containing the index, without surrounding whitespace', () => {
		const text = 'One. Two. Three.';
		expect(at(text, text.indexOf('Two'))).toBe('Two.');
	});

	it('selects the last sentence when the index sits at the very end (ref after final punctuation)', () => {
		const text = 'A first thought. The final claim.';
		expect(at(text, text.length)).toBe('The final claim.');
	});

	it('does not split on a decimal point (durable segmentation, not regex)', () => {
		const text = 'The error was 3.14 percent. We fixed it.';
		expect(at(text, text.indexOf('error'))).toBe('The error was 3.14 percent.');
	});

	it('treats text without terminal punctuation as a single sentence', () => {
		const text = 'just a fragment with no period';
		expect(at(text, 5)).toBe('just a fragment with no period');
	});

	it('selects the following sentence when the index points at its first character', () => {
		const text = 'Alpha runs first. Beta runs second.';
		expect(at(text, text.indexOf('Beta'))).toBe('Beta runs second.');
	});

	it('clamps an out-of-range index to the last sentence', () => {
		const text = 'Only one sentence here.';
		expect(at(text, 999)).toBe('Only one sentence here.');
	});

	it('returns an empty span for empty text', () => {
		expect(sentenceSpanAt('', 0)).toEqual([0, 0]);
	});
});
