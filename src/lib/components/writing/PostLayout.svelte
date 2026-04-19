<script lang="ts">
	import type { Snippet } from 'svelte';
	import TagPill from './TagPill.svelte';

	interface Props {
		title: string;
		description: string;
		date: string;
		updated?: string;
		published?: boolean;
		tags: string[];
		category: string;
		children: Snippet;
	}

	let { title, date, updated, published = true, tags, children }: Props = $props();

	const displayTags = $derived(published ? tags : ['unpublished', ...tags]);

	const dateStr = $derived(
		new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	const updatedStr = $derived(
		updated
			? new Date(updated).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: null
	);
</script>

<article>
	<header class="mb-8 flex flex-col gap-3">
		<h1 class="font-sans text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
		<div class="flex items-center gap-2 font-mono text-xs tracking-wide text-muted">
			<time datetime={date}>{dateStr}</time>
			{#if updatedStr}
				<span>&middot; Updated {updatedStr}</span>
			{/if}
		</div>
		{#if displayTags.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each displayTags as tag (tag)}
					<TagPill {tag} />
				{/each}
			</div>
		{/if}
	</header>
	<div class="prose max-w-none prose-neutral dark:prose-invert">
		{@render children()}
	</div>
</article>
