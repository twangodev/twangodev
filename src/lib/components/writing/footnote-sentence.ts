/**
 * Locale-aware sentence boundary detection backed by `Intl.Segmenter`.
 *
 * Used to highlight "the sentence" a footnote reference attaches to. We rely on
 * the platform segmenter rather than punctuation regexes so that decimals
 * ("3.14"), ellipses, and locale rules are handled correctly.
 */

const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

/**
 * Return the `[start, end)` bounds of the sentence covering `index` within
 * `text`, with leading/trailing whitespace trimmed off the result. An index at
 * (or past) the end of the text resolves to the final sentence.
 */
export function sentenceSpanAt(text: string, index: number): [number, number] {
	if (text.length === 0) return [0, 0];

	let chosen: { start: number; end: number } | null = null;
	let last: { start: number; end: number } | null = null;

	for (const { segment, index: start } of segmenter.segment(text)) {
		const end = start + segment.length;
		last = { start, end };
		if (index < end) {
			chosen = { start, end };
			break;
		}
	}

	const span = chosen ?? last!;
	return trimWhitespace(text, span.start, span.end);
}

function trimWhitespace(text: string, start: number, end: number): [number, number] {
	let s = start;
	let e = end;
	while (s < e && /\s/.test(text[s])) s++;
	while (e > s && /\s/.test(text[e - 1])) e--;
	return [s, e];
}
