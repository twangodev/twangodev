import { describe, it, expect } from 'vitest';
import { toMarkdown } from './markdown';

const baseOpts = {
	metadata: { title: 'My Post', description: 'A description', slug: 'my-post' },
	renderers: {}
};

describe('toMarkdown', () => {
	it('replaces frontmatter with a title heading and keeps prose', () => {
		const svx = `---\ntitle: My Post\ntags:\n  - a\n---\n\nHello **world**.`;
		const md = toMarkdown(svx, baseOpts);
		expect(md).toContain('# My Post');
		expect(md).toContain('Hello **world**.');
		expect(md).not.toContain('title: My Post');
		expect(md).not.toMatch(/^---$/m);
	});

	it('removes script blocks', () => {
		const svx = `---\ntitle: T\n---\n\n<script lang="ts">\n  import X from '$lib/x';\n</script>\n\nProse here.`;
		const md = toMarkdown(svx, baseOpts);
		expect(md).not.toContain('import X');
		expect(md).not.toContain('<script');
		expect(md).toContain('Prose here.');
	});

	it('dispatches a self-closing component to its renderer with parsed props', () => {
		const svx = `---\ntitle: T\n---\n\n<StatCard value="3.05%" label="Best WER" sublabel="E4B" emphasis />`;
		const renderers = {
			StatCard: ({ props }: { props: Record<string, string | boolean> }) =>
				`STAT ${props.value} / ${props.label} / ${props.sublabel} / ${props.emphasis}`
		};
		const md = toMarkdown(svx, { metadata: { title: 'T' }, renderers });
		expect(md).toContain('STAT 3.05% / Best WER / E4B / true');
		expect(md).not.toContain('<StatCard');
	});

	it('dispatches a paired component with inner content and collects footnotes', () => {
		const svx = `---\ntitle: T\n---\n\nText before.<Fn>note body with <code>x</code></Fn> after.`;
		const renderers = {
			Fn: ({ content, footnote }: { content: string; footnote: (b: string) => string }) =>
				footnote(content)
		};
		const md = toMarkdown(svx, { metadata: { title: 'T' }, renderers });
		expect(md).toContain('Text before.[^1] after.');
		expect(md).toContain('## Notes');
		expect(md).toMatch(/\[\^1\]: note body with/);
	});

	it('converts inline <code> and <a> to markdown (in prose and footnotes)', () => {
		const svx = `---\ntitle: T\n---\n\nRun <code>jiwer</code> per <a href="https://x.dev/docs">the docs</a>.`;
		const md = toMarkdown(svx, baseOpts);
		expect(md).toContain('`jiwer`');
		expect(md).toContain('[the docs](https://x.dev/docs)');
		expect(md).not.toContain('<code>');
		expect(md).not.toContain('<a ');
	});

	it('strips div layout wrappers, drops unknown self-closing, unwraps unknown paired', () => {
		const svx = `---\ntitle: T\n---\n\n<div class="not-prose my-10 grid">\n<Mystery foo="bar" />\n<Wrapper>kept text</Wrapper>\n</div>`;
		const md = toMarkdown(svx, baseOpts);
		expect(md).not.toContain('<div');
		expect(md).not.toContain('</div>');
		expect(md).not.toContain('<Mystery');
		expect(md).not.toContain('<Wrapper>');
		expect(md).toContain('kept text');
	});

	it('does not parse component tags inside fenced code blocks', () => {
		const svx = [
			'---',
			'title: T',
			'---',
			'',
			'```svelte',
			'<StatCard value="x" />',
			'```',
			''
		].join('\n');
		const renderers = { StatCard: () => 'RENDERED' };
		const md = toMarkdown(svx, { metadata: { title: 'T' }, renderers });
		expect(md).toContain('<StatCard value="x" />');
		expect(md).not.toContain('RENDERED');
	});

	it('keeps sibling self-closing components separate (no nesting bug)', () => {
		const svx = `---\ntitle: T\n---\n\n<div class="grid">\n<StatCard value="a" />\n<StatCard value="b" />\n</div>`;
		const renderers = {
			StatCard: ({ props }: { props: Record<string, string | boolean> }) => `[${props.value}]`
		};
		const md = toMarkdown(svx, { metadata: { title: 'T' }, renderers });
		expect(md).toContain('[a]');
		expect(md).toContain('[b]');
		expect(md).not.toContain('<div');
	});

	it('passes plain markdown prose through untouched', () => {
		const svx = `---\ntitle: T\n---\n\n## Heading\n\n- a [link](https://x.dev)\n- **bold** and \`code\``;
		const md = toMarkdown(svx, baseOpts);
		expect(md).toContain('## Heading');
		expect(md).toContain('- a [link](https://x.dev)');
		expect(md).toContain('**bold** and `code`');
	});
});
