import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument } from 'htmlparser2';
import type { AgentText, AgentTextContext } from './agent-text';

export interface ToMarkdownOptions {
	metadata: { title: string; description?: string };
	renderers: Record<string, AgentText>;
	baseUrl?: string;
}

/**
 * Convert a `.svx` source string to clean Markdown.
 *
 * svx *is* markdown, save for frontmatter, the `<script>` block, and component
 * tags. So prose and fenced code pass through verbatim — only the component
 * tags are transformed. Parsing is delegated to real parsers, never regex over
 * tag structure: the remark/mdast core ({@link fromMarkdown}) locates fenced and
 * inline code so it is never mistaken for markup, and htmlparser2 in `xmlMode`
 * parses the component tags (honouring self-closing custom elements, case, and
 * nesting). Components are dispatched to their {@link AgentText} renderers.
 */
export function toMarkdown(rawSvx: string, options: ToMarkdownOptions): string {
	const notes: string[] = [];
	const footnote = (body: string): string => {
		notes.push(body.trim());
		return `[^${notes.length}]`;
	};

	let body = stripFrontmatter(rawSvx);
	body = stripScriptsAndStyles(body);

	const { masked, restore } = maskCode(body);
	const doc = parseDocument(masked, { xmlMode: true, decodeEntities: false });
	const rendered = renderNodes(doc.children as unknown as DomNode[], {
		renderers: options.renderers,
		footnote
	});

	let out = `# ${options.metadata.title}\n\n${rendered.trim()}\n`;
	if (notes.length > 0) {
		out += `\n## Notes\n\n${notes.map((n, i) => `[^${i + 1}]: ${n}`).join('\n\n')}\n`;
	}

	out = collapseBlankLines(out);
	out = restore(out); // restore code last, so blank-line collapse can't touch it
	return out;
}

function stripFrontmatter(src: string): string {
	const match = src.match(/^---\n[\s\S]*?\n---\n?/);
	return match ? src.slice(match[0].length) : src;
}

// `<script>`/`<style>` blocks are stripped before HTML parsing: in xmlMode their
// TypeScript/CSS bodies (e.g. `Map<string, number>`) would be misread as markup.
function stripScriptsAndStyles(src: string): string {
	return src.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
}

// --- code masking (remark/mdast) ---------------------------------------------

interface MdNode {
	type: string;
	position?: { start: { offset?: number }; end: { offset?: number } };
	children?: MdNode[];
}

// Private-use-area delimiters that cannot collide with prose/markup content.
const TOKEN_OPEN = String.fromCharCode(0xe000);
const TOKEN_CLOSE = String.fromCharCode(0xe001);
const TOKEN_RE = new RegExp(`${TOKEN_OPEN}(\\d+)${TOKEN_CLOSE}`, 'g');

function maskCode(body: string): { masked: string; restore: (s: string) => string } {
	const spans: { start: number; end: number }[] = [];
	collectCodeSpans(fromMarkdown(body) as unknown as MdNode, spans);
	spans.sort((a, b) => b.start - a.start); // splice from the end so earlier offsets stay valid

	const store: string[] = [];
	let masked = body;
	for (const { start, end } of spans) {
		const token = TOKEN_OPEN + store.length + TOKEN_CLOSE;
		store.push(body.slice(start, end));
		masked = masked.slice(0, start) + token + masked.slice(end);
	}

	const restore = (s: string) => s.replace(TOKEN_RE, (_m, i) => store[Number(i)] ?? '');
	return { masked, restore };
}

function collectCodeSpans(node: MdNode, spans: { start: number; end: number }[]): void {
	if ((node.type === 'code' || node.type === 'inlineCode') && node.position) {
		const start = node.position.start.offset;
		const end = node.position.end.offset;
		if (start !== undefined && end !== undefined) spans.push({ start, end });
		return;
	}
	for (const child of node.children ?? []) collectCodeSpans(child, spans);
}

// --- HTML/component rendering (htmlparser2) -----------------------------------

interface DomNode {
	type: string;
	name?: string;
	data?: string;
	attribs?: Record<string, string>;
	children?: DomNode[];
}

interface RenderCtx {
	renderers: Record<string, AgentText>;
	footnote: AgentTextContext['footnote'];
}

function renderNodes(nodes: DomNode[], ctx: RenderCtx): string {
	return nodes.map((node) => renderNode(node, ctx)).join('');
}

function renderNode(node: DomNode, ctx: RenderCtx): string {
	if (node.type === 'text') {
		const text = node.data ?? '';
		// Whitespace-only text between tags is layout indentation; collapse it so
		// leaked tabs can't turn unwrapped component output into a code block.
		if (text.trim() === '') return text.includes('\n') ? '\n' : ' ';
		return text;
	}
	if (node.type !== 'tag') return ''; // comments, cdata, directives — drop

	const name = node.name ?? '';
	const children = node.children ?? [];

	const renderer = ctx.renderers[name];
	if (renderer) {
		return renderer({
			props: coerceProps(node.attribs ?? {}),
			content: renderNodes(children, ctx).trim(),
			footnote: ctx.footnote
		});
	}

	switch (name.toLowerCase()) {
		case 'code':
			return '`' + renderNodes(children, ctx) + '`';
		case 'a': {
			const href = node.attribs?.href ?? '';
			const text = renderNodes(children, ctx).trim();
			return href ? `[${text}](${href})` : text;
		}
		case 'br':
			return '\n';
		default:
			// Layout wrappers (div/figure/…) and unregistered components unwrap to
			// their inner content.
			return renderNodes(children, ctx);
	}
}

/** htmlparser2 yields string attributes; bare attributes (`emphasis`) become `''`. */
function coerceProps(attribs: Record<string, string>): Record<string, string | boolean> {
	const props: Record<string, string | boolean> = {};
	for (const [key, value] of Object.entries(attribs)) {
		props[key] = value === '' ? true : value;
	}
	return props;
}

function collapseBlankLines(src: string): string {
	return src.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}
