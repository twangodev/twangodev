<script lang="ts">
	import type { Snippet } from 'svelte';
	import TagPill from './TagPill.svelte';

	interface Props {
		title: string;
		description: string;
		date: string;
		updated?: string;
		tags: string[];
		category: string;
		children: Snippet;
	}

	let { title, date, updated, tags, children }: Props = $props();

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
		{#if tags.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each tags as tag (tag)}
					<TagPill {tag} />
				{/each}
			</div>
		{/if}
	</header>
	<div class="prose max-w-none prose-neutral dark:prose-invert">
		{@render children()}
	</div>
</article>
