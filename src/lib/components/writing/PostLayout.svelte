<script lang="ts">
	import type { Snippet } from 'svelte';
	import TagPill from './TagPill.svelte';
	import Footnotes from './Footnotes.svelte';
	import { setFootnoteRegistry } from './footnotes';

	setFootnoteRegistry();

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
		<Footnotes />
	</div>
</article>

<style>
	:global(.prose .footnote-ref) {
		font-weight: 600;
		line-height: 0;
		white-space: nowrap;
		scroll-margin-top: 5rem;
	}
	:global(.prose .footnote-ref a) {
		padding: 0 0.15em;
		color: var(--color-accent);
		text-decoration: none;
	}
	:global(.prose .footnote-ref a:hover) {
		text-decoration: underline;
	}

	:global(.prose .footnotes) {
		margin-top: 3rem;
		border-top: 1px solid var(--color-subtle);
		padding-top: 1.5rem;
	}
	:global(.prose .footnotes h2) {
		margin: 0 0 1rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	:global(.prose .footnotes ol) {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}
	:global(.prose .footnotes li) {
		margin: 0.5rem 0;
		scroll-margin-top: 5rem;
	}
	:global(.prose .footnotes li::marker) {
		color: var(--color-muted);
	}
	:global(.prose .footnotes a:not(.footnote-backref)) {
		color: var(--color-accent);
	}
	:global(.prose .footnote-backref) {
		margin-left: 0.35em;
		color: var(--color-accent);
		text-decoration: none;
	}
	:global(.prose .footnote-backref:hover) {
		text-decoration: underline;
	}
</style>
