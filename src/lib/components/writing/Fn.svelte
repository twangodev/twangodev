<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';

	export const agentText: AgentText = ({ content, footnote }) => footnote(content);
</script>

<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { getFootnoteRegistry } from './footnotes';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const number = getFootnoteRegistry().register(note);
</script>

{#snippet note()}
	{@render children()}
{/snippet}

<Tooltip.Provider delayDuration={200}>
	<Tooltip.Root>
		<sup id={`fnref-${number}`} class="footnote-ref">
			<Tooltip.Trigger>
				{#snippet child({ props })}
					{@const { type, ...rest } = props}
					<a {...rest} href={`#fn-${number}`} aria-label={`Footnote ${number}`}>{number}</a>
				{/snippet}
			</Tooltip.Trigger>
		</sup>
		<Tooltip.Portal>
			<Tooltip.Content
				sideOffset={6}
				class="footnote-popover z-50 max-w-xs rounded-md border border-subtle bg-bg px-3 py-2 text-sm leading-snug text-text shadow-lg duration-150 animate-in fade-in-0 [&_a]:text-accent [&_a]:underline"
			>
				{@render note()}
				<Tooltip.Arrow class="border-subtle fill-bg" />
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
