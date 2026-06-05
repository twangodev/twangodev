import { getContext, setContext, type Snippet } from 'svelte';

const FOOTNOTE_KEY = Symbol('footnotes');

export interface FootnoteEntry {
	content: Snippet;
}

export interface FootnoteRegistry {
	register(content: Snippet): number;
	readonly notes: FootnoteEntry[];
}

export function setFootnoteRegistry(): FootnoteRegistry {
	const notes: FootnoteEntry[] = [];
	const registry: FootnoteRegistry = {
		register(content) {
			notes.push({ content });
			return notes.length;
		},
		get notes() {
			return notes;
		}
	};
	setContext(FOOTNOTE_KEY, registry);
	return registry;
}

export function getFootnoteRegistry(): FootnoteRegistry {
	const registry = getContext<FootnoteRegistry | undefined>(FOOTNOTE_KEY);
	if (!registry) {
		throw new Error(
			'Footnote components must be rendered inside a layout that calls setFootnoteRegistry().'
		);
	}
	return registry;
}
