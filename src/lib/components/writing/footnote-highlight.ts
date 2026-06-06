import { sentenceSpanAt } from './footnote-sentence';

/**
 * Svelte attachment for the prose container. Intercepts clicks on footnote
 * links and, instead of an instant anchor jump, smooth-scrolls to the target
 * and briefly highlights it:
 *
 *   - clicking a footnote reference (`#fn-N`)   -> highlights the definition `<li>`
 *   - clicking a `↩` backref     (`#fnref-N`)  -> highlights the source sentence in the body
 *
 * The highlight holds for a few seconds, then fades. Re-clicking restarts it.
 */

const HOLD_MS = 3000;
const FADE_MS = 600;

interface ActiveHighlight {
	out: () => void; // begin the fade
	clear: () => void; // tear the highlight down immediately
	timers: ReturnType<typeof setTimeout>[];
}

export function highlightFootnotes(container: HTMLElement) {
	let active: ActiveHighlight | null = null;

	const dismiss = () => {
		if (!active) return;
		active.timers.forEach(clearTimeout);
		active.clear();
		active = null;
	};

	const schedule = (highlight: ActiveHighlight) => {
		dismiss();
		active = highlight;
		highlight.timers.push(
			setTimeout(() => {
				highlight.out();
				highlight.timers.push(
					setTimeout(() => {
						highlight.clear();
						if (active === highlight) active = null;
					}, FADE_MS)
				);
			}, HOLD_MS)
		);
	};

	const onClick = (event: MouseEvent) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
		const link = (event.target as Element | null)?.closest('a[href^="#fn"]');
		if (!(link instanceof HTMLAnchorElement)) return;

		const id = link.getAttribute('href')!.slice(1);
		const target = container.ownerDocument.getElementById(id);
		if (!target) return;

		event.preventDefault();

		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';

		const highlight = id.startsWith('fnref-')
			? highlightSentence(target, behavior)
			: highlightElement(target, behavior);

		if (highlight) schedule(highlight);
	};

	container.addEventListener('click', onClick);
	return () => {
		dismiss();
		container.removeEventListener('click', onClick);
	};
}

/** Highlight a whole element (used for the footnote definition `<li>`). */
function highlightElement(el: HTMLElement, behavior: ScrollBehavior): ActiveHighlight {
	el.classList.remove('fn-hl--out');
	el.classList.add('fn-hl');
	el.scrollIntoView({ behavior, block: 'center' });
	return {
		out: () => el.classList.add('fn-hl--out'),
		clear: () => el.classList.remove('fn-hl', 'fn-hl--out'),
		timers: []
	};
}

/**
 * Highlight the sentence in the body that a footnote reference attaches to.
 * Wraps only the prose text fragments of the sentence in `<span>`s, leaving the
 * footnote `<sup>` and any inline math untouched.
 */
function highlightSentence(sup: HTMLElement, behavior: ScrollBehavior): ActiveHighlight | null {
	const block = sup.closest('p, li, blockquote, figcaption, dd, td, th') ?? sup.parentElement;
	if (!block) return null;

	const { text, refIndex, pieces } = collectText(block, sup);
	if (!text) return null;

	const [start, end] = sentenceSpanAt(text, refIndex);
	if (end <= start) return null;

	const spans: HTMLSpanElement[] = [];
	for (const piece of pieces) {
		const from = Math.max(piece.start, start);
		const to = Math.min(piece.end, end);
		if (from < to) spans.push(wrapFragment(piece.node, from - piece.start, to - piece.start));
	}
	if (spans.length === 0) return null;

	spans[0].scrollIntoView({ behavior, block: 'center' });

	return {
		out: () => spans.forEach((span) => span.classList.add('fn-hl--out')),
		clear: () => unwrap(spans, block),
		timers: []
	};
}

interface TextPiece {
	node: Text;
	start: number;
	end: number;
}

/**
 * Build the plain-text content of `block` while recording, for each contributing
 * text node, its character span in that text. Skips the footnote refs (so a
 * trailing footnote number can't merge two sentences) and KaTeX math (so the
 * highlight never splits rendered formulas). Also reports where `sup` sits.
 */
function collectText(block: Element, sup: Element) {
	let text = '';
	let refIndex = -1;
	const pieces: TextPiece[] = [];

	const walk = (node: Node) => {
		for (const child of node.childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				const start = text.length;
				text += (child as Text).data;
				pieces.push({ node: child as Text, start, end: text.length });
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				const el = child as Element;
				if (el === sup) {
					refIndex = text.length;
				} else if (el.classList.contains('footnote-ref') || el.classList.contains('katex')) {
					// skip: footnote numbers and math text are not part of the sentence
				} else {
					walk(el);
				}
			}
		}
	};
	walk(block);

	if (refIndex === -1) refIndex = text.length;
	return { text, refIndex, pieces };
}

/** Wrap `[localStart, localEnd)` of a text node in a highlight span. */
function wrapFragment(textNode: Text, localStart: number, localEnd: number): HTMLSpanElement {
	let node = textNode;
	if (localStart > 0) node = node.splitText(localStart);
	if (localEnd - localStart < node.data.length) node.splitText(localEnd - localStart);

	const span = node.ownerDocument.createElement('span');
	span.className = 'fn-hl';
	node.parentNode!.insertBefore(span, node);
	span.appendChild(node);
	return span;
}

/** Replace each span with its text content and re-merge adjacent text nodes. */
function unwrap(spans: HTMLSpanElement[], block: Element) {
	for (const span of spans) {
		const parent = span.parentNode;
		if (!parent) continue;
		while (span.firstChild) parent.insertBefore(span.firstChild, span);
		parent.removeChild(span);
	}
	block.normalize();
}
