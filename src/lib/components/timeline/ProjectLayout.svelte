<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		description?: string;
		dateStart: string;
		dateEnd?: string;
		url?: string;
		logo?: string;
		tags: string[];
		published: boolean;
		color?: string;
		commits: string[];
		base: string;
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}
