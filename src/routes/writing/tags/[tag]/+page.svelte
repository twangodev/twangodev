<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { PostList, TagPill } from '$lib/components/writing';

	const { data } = $props();
</script>

<svelte:head>
	<title>Posts tagged "{data.tag}"</title>
</svelte:head>

<div class="flex flex-col gap-6 pb-24">
	<div class="flex items-center gap-3">
		<Heading level={2}>Tagged</Heading>
		<TagPill tag={data.tag} active />
	</div>
	<PostList posts={data.posts} />
</div>
