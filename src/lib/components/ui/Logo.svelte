<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Size = 'sm' | 'lg';

	interface Props {
		size?: Size;
		href?: string;
		class?: ClassValue;
	}

	const sizeStyles: Record<Size, string> = {
		sm: 'text-sm text-muted transition-colors hover:text-text',
		lg: 'text-lg font-semibold text-text'
	};

	let { size = 'sm', href, class: className }: Props = $props();
</script>

{#if href}
	<a {href} class="{sizeStyles[size]} {className}">td.</a>
{:else}
	<span class="{sizeStyles[size]} {className}">td.</span>
{/if}
