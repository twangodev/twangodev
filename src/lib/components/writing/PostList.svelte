<script lang="ts">
	import type { PostMetadata } from '$lib/types/writing';
	import PostCard from './PostCard.svelte';
	import { Divider } from '$lib/components/ui';

	interface Props {
		posts: PostMetadata[];
	}

	let { posts }: Props = $props();
</script>

{#if posts.length === 0}
	<p class="py-8 text-center font-mono text-sm text-muted">No posts found.</p>
{:else}
	<div class="flex flex-col">
		{#each posts as post, i (post.slug)}
			{#if i > 0}
				<Divider width="full" spacing="md" />
			{/if}
			<PostCard {post} />
		{/each}
	</div>
{/if}
