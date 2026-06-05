import type { AgentText } from './agent-text';

// Every writing component that opts into clean agent output by exporting
// `agentText` from its `<script module>` block. Resolved by file name, which
// matches the tag name posts import it as (e.g. StatCard.svelte → <StatCard>).
const modules = import.meta.glob<{ agentText?: AgentText }>(
	'/src/lib/components/writing/*.svelte',
	{ eager: true }
);

let cache: Record<string, AgentText> | undefined;

export function getRenderers(): Record<string, AgentText> {
	if (cache) return cache;
	const renderers: Record<string, AgentText> = {};
	for (const [path, mod] of Object.entries(modules)) {
		if (typeof mod.agentText === 'function') {
			const name = path.split('/').pop()!.replace('.svelte', '');
			renderers[name] = mod.agentText;
		}
	}
	cache = renderers;
	return renderers;
}
