<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';

	const PLUGIN_URL = 'https://plugins.jetbrains.com/plugin/31014-jetplay';

	// Inlined at build time from the JetBrains Marketplace API (see vite.config.ts).
	declare const __JETPLAY_DOWNLOADS__: number;

	export const agentText: AgentText = () =>
		`[Get Jetplay on the JetBrains Marketplace](${PLUGIN_URL})`;
</script>

<script lang="ts">
	import jetbrainsLogo from '$lib/assets/jetbrains.svg?raw';

	const downloads = __JETPLAY_DOWNLOADS__.toLocaleString('en-US');
</script>

<figure class="not-prose my-8">
	<a
		href={PLUGIN_URL}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-3 rounded-xl border border-subtle bg-surface px-4 py-2.5 transition-colors hover:border-muted/50"
	>
		<span class="inline-flex h-8 w-8 shrink-0 [&>svg]:size-full">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted local brand asset -->
			{@html jetbrainsLogo}
		</span>
		<span class="flex flex-col leading-none">
			<span class="font-sans text-[0.6rem] font-medium tracking-[0.14em] text-muted uppercase">
				Get it from
			</span>
			<span class="mt-1 font-sans text-base font-semibold tracking-tight text-text">
				JetBrains Marketplace
			</span>
			<span class="mt-1 font-mono text-[0.65rem] tracking-wide text-muted">
				{downloads} downloads
			</span>
		</span>
	</a>
</figure>
