<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		class?: ClassValue;
		children: Snippet;
	}

	let { label, class: className, children }: Props = $props();
</script>

<div class="flex items-baseline gap-3 {className}">
	<dt class="w-28 shrink-0 font-mono text-xs tracking-wider text-muted">[{label}]</dt>
	<dd>
		{@render children()}
	</dd>
</div>
