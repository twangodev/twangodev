import { describe, it, expect } from 'vitest';
import { toMarkdown } from './markdown';
import type { AgentText } from './agent-text';

const postSources = import.meta.glob('/src/content/writing/*.svx', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const componentSources = import.meta.glob('/src/lib/components/writing/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

// Private-use-area code-mask delimiters used by toMarkdown; none must survive.
const MASK_TOKEN = new RegExp(`[${String.fromCharCode(0xe000)}${String.fromCharCode(0xe001)}]`);

const componentsWithAgentText = new Set(
	Object.entries(componentSources)
		.filter(([, src]) => /export\s+const\s+agentText\b/.test(src))
		.map(([path]) => path.split('/').pop()!.replace('.svelte', ''))
);

const posts = Object.entries(postSources).map(([path, source]) => ({
	slug: path.split('/').pop()!.replace('.svx', ''),
	source
}));

function recordingRenderers(used: Set<string>): Record<string, AgentText> {
	return new Proxy(
		{},
		{
			get(_target, name) {
				if (typeof name === 'string' && /^[A-Z]/.test(name)) {
					used.add(name);
					return (() => '') as AgentText;
				}
				return undefined;
			}
		}
	);
}

it('has at least one post to guard', () => {
	expect(posts.length).toBeGreaterThan(0);
});

describe.each(posts)('post: $slug', ({ source }) => {
	it('only uses components that export agentText', () => {
		const used = new Set<string>();
		toMarkdown(source, { metadata: { title: 'T' }, renderers: recordingRenderers(used) });
		for (const name of used) {
			expect(componentsWithAgentText, `<${name}> is missing an agentText export`).toContain(name);
		}
	});

	it('produces clean markdown with no leaked tags or mask tokens', () => {
		const used = new Set<string>();
		const md = toMarkdown(source, {
			metadata: { title: 'T' },
			renderers: recordingRenderers(used)
		});
		expect(md).not.toMatch(/<script/i);
		expect(md).not.toMatch(/<\/?[A-Z][A-Za-z0-9]*[\s/>]/);
		expect(md).not.toMatch(MASK_TOKEN);
		expect(md.trim().length).toBeGreaterThan(0);
	});
});
