<script lang="ts">
	import type { PostMetadata } from '$lib/types/writing';
	import TagPill from './TagPill.svelte';

	interface Props {
		post: PostMetadata;
	}

	let { post }: Props = $props();

	const dateStr = $derived(
		new Date(post.date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	);
</script>

<article class="flex flex-col gap-2">
	<a href="/writing/{post.slug}" class="group">
		<h3
			class="font-sans text-lg font-semibold tracking-tight transition-colors group-hover:text-accent"
		>
			{post.title}
		</h3>
	</a>
	<p class="font-mono text-xs tracking-wide text-muted">{dateStr}</p>
	{#if post.description}
		<p class="text-sm leading-relaxed text-text/80">{post.description}</p>
	{/if}
	{#if post.tags.length > 0}
		<div class="flex flex-wrap gap-1.5">
			{#each post.tags as tag (tag)}
				<TagPill {tag} />
			{/each}
		</div>
	{/if}
</article>
