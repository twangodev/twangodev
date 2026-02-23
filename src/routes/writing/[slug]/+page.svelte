<script lang="ts">
	import { SeriesNav } from '$lib/components/writing';

	const { data } = $props();
	const Component = $derived(data.component);
</script>

<svelte:head>
	<title>{data.metadata.title}</title>
	<meta name="description" content={data.metadata.description} />
</svelte:head>

<div class="flex max-w-none flex-col gap-6 pb-24">
	<Component />

	{#if data.metadata.series && data.seriesPosts.length > 1}
		<SeriesNav
			seriesName={data.metadata.series.name}
			seriesPosts={data.seriesPosts}
			currentSlug={data.metadata.slug}
		/>
	{/if}
</div>
