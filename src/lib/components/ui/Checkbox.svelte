<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props {
		checked?: boolean;
		onchange?: (checked: boolean) => void;
		class?: ClassValue;
		children?: Snippet;
	}

	let { checked = $bindable(false), onchange, class: className, children }: Props = $props();

	function toggle() {
		checked = !checked;
		onchange?.(checked);
	}
</script>

<button onclick={toggle} class="flex cursor-pointer items-center gap-2 text-left {className}">
	<span class="font-mono text-sm tracking-wider text-muted">{checked ? '[x]' : '[ ]'}</span>
	{#if children}
		{@render children()}
	{/if}
</button>
