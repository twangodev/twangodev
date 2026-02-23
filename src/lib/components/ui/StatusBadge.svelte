<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		src?: string;
		alt?: string;
		class?: ClassValue;
	}

	let {
		src = 'https://kener.twango.dev/badge/_/dot?animate=ping',
		alt = 'Service status',
		class: className
	}: Props = $props();
</script>

<img {src} {alt} class="h-3 w-3 translate-y-px sepia-[.2] saturate-[.7] {className}" />
