<script lang="ts">
	import type { TimelineEntry } from '$lib/types/timeline';
	import { entrySlug } from '$lib/types/timeline';
	import { computeGraphLayout, getMaxLane } from '$lib/timeline/layout';
	import { SvelteSet } from 'svelte/reactivity';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import GitGraphRow from './GitGraphRow.svelte';

	interface Props {
		entries: TimelineEntry[];
	}

	let { entries }: Props = $props();

	const expandedSlugs = new SvelteSet<string>();

	const layout = $derived(computeGraphLayout(entries, expandedSlugs));
	const maxLane = $derived(getMaxLane(layout));

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	const allSlugs = $derived(entries.map(entrySlug));
	const allExpanded = $derived(allSlugs.length > 0 && allSlugs.every((s) => expandedSlugs.has(s)));

	function toggle(slug: string) {
		if (expandedSlugs.has(slug)) {
			expandedSlugs.delete(slug);
		} else {
			expandedSlugs.add(slug);
		}
	}

	function toggleAll() {
		if (allExpanded) {
			expandedSlugs.clear();
		} else {
			for (const slug of allSlugs) {
				expandedSlugs.add(slug);
			}
		}
	}

	function rowKey(row: (typeof layout)[number], index: number): string {
		if (row.type === 'merge') return `merge-${entrySlug(row.entry)}`;
		if (row.type === 'branch-out') return `bo-${row.entrySlug}`;
		if (row.type === 'metadata') return `meta-${entrySlug(row.entry)}`;
		if (row.type === 'commit') return `c-${row.entrySlug}-${row.commitIndex}`;
		if (row.type === 'fork') return `fork-${row.entrySlug}`;
		if (row.type === 'spacer') return `spacer-${index}`;
		if (row.type === 'initial') return 'initial';
		return `row-${index}`;
	}
</script>

<div class="flex flex-col">
	<div class="flex justify-end pb-1">
		<button
			class="cursor-pointer font-mono text-xs text-muted transition-colors hover:text-accent"
			onclick={toggleAll}
		>
			{allExpanded ? 'collapse all' : 'expand all'}
		</button>
	</div>
	{#each layout as row, i (rowKey(row, i))}
		<div animate:flip={{ duration: mounted ? 300 : 0, easing: cubicOut }}>
			<GitGraphRow
				{row}
				{maxLane}
				ontoggle={toggle}
				expanded={row.type === 'merge' ? expandedSlugs.has(entrySlug(row.entry)) : false}
			/>
		</div>
	{/each}
</div>
