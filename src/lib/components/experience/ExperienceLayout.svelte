<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		company: string;
		role: string;
		dateStart: string;
		dateEnd?: string;
		logo?: string;
		url?: string;
		tags: string[];
		published: boolean;
		color?: string;
		commits: string[];
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}
