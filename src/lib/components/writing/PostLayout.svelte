<script lang="ts">
	import type { Snippet } from 'svelte';
	import TagPill from './TagPill.svelte';
	import Footnotes from './Footnotes.svelte';
	import { setFootnoteRegistry } from './footnotes';
	import { highlightFootnotes } from './footnote-highlight';

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

	const copyIcon =
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
	const checkIcon =
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

	function enhanceCodeBlocks(node: HTMLElement) {
		const blocks = Array.from(node.querySelectorAll('pre.shiki'));
		const cleanups = blocks.map((pre) => {
			const wrapper = document.createElement('div');
			wrapper.className = 'code-block';
			pre.replaceWith(wrapper);
			wrapper.appendChild(pre);

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'copy-button';
			button.setAttribute('aria-label', 'Copy code');
			button.innerHTML = copyIcon;
			wrapper.appendChild(button);

			let timer: ReturnType<typeof setTimeout>;
			const onClick = async () => {
				try {
					await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
					button.classList.add('copied');
					button.innerHTML = checkIcon;
					clearTimeout(timer);
					timer = setTimeout(() => {
						button.classList.remove('copied');
						button.innerHTML = copyIcon;
					}, 1600);
				} catch {
					button.setAttribute('aria-label', 'Copy failed');
				}
			};
			button.addEventListener('click', onClick);

			return () => {
				clearTimeout(timer);
				button.removeEventListener('click', onClick);
			};
		});

		return () => cleanups.forEach((fn) => fn());
	}
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
	<div
		class="prose max-w-none prose-neutral dark:prose-invert"
		{@attach enhanceCodeBlocks}
		{@attach highlightFootnotes}
	>
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
		color: var(--color-text);
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
	:global(.prose .footnote-backref) {
		margin-left: 0.35em;
		color: var(--color-text);
		text-decoration: none;
	}
	:global(.prose .footnote-backref:hover) {
		text-decoration: underline;
	}

	/* Transient highlight applied when a footnote link is followed. The base
	   class appears instantly; the `--out` modifier fades it away. */
	:global(.prose .fn-hl) {
		border-radius: 0.2rem;
		background-color: color-mix(in srgb, var(--color-accent) 32%, transparent);
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}
	:global(.prose .fn-hl--out) {
		background-color: transparent;
		transition: background-color 600ms ease-out;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.prose .fn-hl--out) {
			transition: none;
		}
	}
</style>
