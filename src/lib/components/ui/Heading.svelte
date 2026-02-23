<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Level = 1 | 2 | 3 | 4 | 5 | 6;

	interface Props {
		level?: Level;
		class?: ClassValue;
		children: Snippet;
	}

	const levelStyles: Record<Level, string> = {
		1: 'font-sans text-5xl font-semibold tracking-tight sm:text-6xl',
		2: 'font-sans text-3xl font-semibold tracking-tight sm:text-4xl',
		3: 'font-sans text-2xl font-semibold tracking-tight',
		4: 'font-sans text-xl font-semibold tracking-tight',
		5: 'font-sans text-lg font-semibold',
		6: 'font-sans text-base font-semibold'
	};

	let { level = 1, class: className, children }: Props = $props();

	const tag = $derived(`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
</script>

<svelte:element this={tag} class="{levelStyles[level]} {className}">
	{@render children()}
</svelte:element>
