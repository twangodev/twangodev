<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { PostList } from '$lib/components/writing';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
</script>

<SEO
	title={`Category: ${data.category}`}
	description={`Posts in the "${data.category}" category`}
	canonical={`/writing/categories/${data.category}`}
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Writing', url: '/writing' },
		{ name: data.category, url: `/writing/categories/${data.category}` }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>{data.category}</Heading>
	<PostList posts={data.posts} />
</div>
