<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { PostList } from '$lib/components/writing';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
</script>

<SEO
	title={`Series: ${data.series}`}
	description={`Posts in the "${data.series}" series`}
	canonical={`/writing/series/${data.series}`}
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Writing', url: '/writing' },
		{ name: data.series, url: `/writing/series/${data.series}` }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>Series: {data.series}</Heading>
	<PostList posts={data.posts} />
</div>
