<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { PostList, TagPill } from '$lib/components/writing';
	import SEO from '$lib/components/SEO.svelte';
	import { breadcrumbSchema } from '$lib/schema';

	const { data } = $props();
</script>

<SEO
	title={`Posts tagged "${data.tag}"`}
	description={`All posts tagged with "${data.tag}"`}
	canonical={`/writing/tags/${data.tag}`}
	jsonLd={breadcrumbSchema([
		{ name: 'Home', url: '/' },
		{ name: 'Writing', url: '/writing' },
		{ name: data.tag, url: `/writing/tags/${data.tag}` }
	])}
/>

<div class="flex flex-col gap-6 pb-24">
	<div class="flex items-center gap-3">
		<Heading level={2}>Tagged</Heading>
		<TagPill tag={data.tag} active />
	</div>
	<PostList posts={data.posts} />
</div>
