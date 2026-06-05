import type { AgentText } from './agent-text';

// Keyed by file name, which is the tag posts use (StatCard.svelte → <StatCard>).
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
