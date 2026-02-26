<script lang="ts">
	import { SeriesNav } from '$lib/components/writing';
	import SEO from '$lib/components/SEO.svelte';
	import { articleSchema, breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
	const Component = $derived(data.component);
</script>

<SEO
	title={data.metadata.title}
	description={data.metadata.description}
	canonical={`/writing/${data.metadata.slug}`}
	type="article"
	article={{
		publishedTime: data.metadata.date,
		modifiedTime: data.metadata.updated,
		tags: data.metadata.tags,
		section: data.metadata.category
	}}
	jsonLd={[
		articleSchema(data.metadata),
		breadcrumbSchema([
			{ name: 'Home', url: '/' },
			{ name: 'Writing', url: '/writing' },
			{ name: data.metadata.title, url: `/writing/${data.metadata.slug}` }
		])
	]}
/>

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
