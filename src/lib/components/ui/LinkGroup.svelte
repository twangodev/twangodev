<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { Dot } from '@lucide/svelte';

	interface Props {
		items: Snippet[];
		class?: ClassValue;
	}

	let { items, class: className }: Props = $props();
</script>

<div class="flex items-center gap-1 {className}">
	{#each items as item, i}
		{#if i > 0}
			<Dot size={16} strokeWidth={3} class="shrink-0 text-muted" />
		{/if}
		{@render item()}
	{/each}
</div>