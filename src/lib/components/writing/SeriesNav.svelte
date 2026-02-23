<script lang="ts">
	import type { PostMetadata } from '$lib/types/writing';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';

	interface Props {
		seriesName: string;
		seriesPosts: PostMetadata[];
		currentSlug: string;
	}

	let { seriesName, seriesPosts, currentSlug }: Props = $props();

	const currentIndex = $derived(seriesPosts.findIndex((p) => p.slug === currentSlug));
	const prev = $derived(currentIndex > 0 ? seriesPosts[currentIndex - 1] : undefined);
	const next = $derived(
		currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : undefined
	);
</script>

<nav class="flex flex-col gap-3 rounded-lg border border-subtle p-4">
	<p class="font-mono text-xs tracking-wide text-muted">
		Series: <a href="/writing/series/{seriesName}" class="text-accent hover:underline"
			>{seriesName}</a
		>
		&middot; Part {currentIndex + 1} of {seriesPosts.length}
	</p>
	<div class="flex items-center justify-between gap-4">
		{#if prev}
			<a
				href="/writing/{prev.slug}"
				class="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
			>
				<ArrowLeft size={14} />
				<span class="line-clamp-1">{prev.title}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a
				href="/writing/{next.slug}"
				class="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
			>
				<span class="line-clamp-1">{next.title}</span>
				<ArrowRight size={14} />
			</a>
		{/if}
	</div>
</nav>
