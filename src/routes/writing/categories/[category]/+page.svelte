<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { PostList } from '$lib/components/writing';

	const { data } = $props();
</script>

<svelte:head>
	<title>Category: {data.category}</title>
</svelte:head>

<div class="flex flex-col gap-6 pb-24">
	<Heading level={2}>{data.category}</Heading>
	<PostList posts={data.posts} />
</div>
