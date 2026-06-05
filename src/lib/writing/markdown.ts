import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument } from 'htmlparser2';
import type { AgentText, AgentTextContext } from './agent-text';

export interface ToMarkdownOptions {
	metadata: { title: string; description?: string };
	renderers: Record<string, AgentText>;
	baseUrl?: string;
}

// svx is markdown apart from frontmatter, <script>, and component tags. Parsing
// is delegated to real parsers so prose and fenced code pass through verbatim:
// mdast protects code spans, htmlparser2 (xmlMode) parses the component tags.
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

// Stripped before parsing: xmlMode would misread TS/CSS bodies (e.g. Map<string, number>) as markup.
function stripScriptsAndStyles(src: string): string {
	return src.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
}

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
	if (node.type !== 'tag') return '';

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
			// div/figure wrappers and unregistered components unwrap to inner content.
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
