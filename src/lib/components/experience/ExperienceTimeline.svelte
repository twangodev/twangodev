<script lang="ts">
	import type { ExperienceMetadata } from '$lib/types/experience';
	import { SvelteSet } from 'svelte/reactivity';
	import ExperienceEntry from './ExperienceEntry.svelte';
	import CommitRow from './CommitRow.svelte';

	interface Props {
		experiences: ExperienceMetadata[];
	}

	let { experiences }: Props = $props();

	const COLORS = [
		'#167bff',
		'#e5534b',
		'#57ab5a',
		'#c69026',
		'#b083f0',
		'#e0823d',
		'#6cb6ff',
		'#f47067'
	];

	const expandedSlugs = new SvelteSet<string>();

	function getColor(exp: ExperienceMetadata, index: number): string {
		return exp.color ?? COLORS[index % COLORS.length];
	}

	function generateHash(): string {
		return Math.random().toString(16).slice(2, 9);
	}

	const hashes = $derived(experiences.map(() => generateHash()));
	const initialHash = generateHash();

	function toggle(slug: string) {
		if (expandedSlugs.has(slug)) {
			expandedSlugs.delete(slug);
		} else {
			expandedSlugs.add(slug);
		}
	}
</script>

<div class="flex flex-col">
	{#each experiences as exp, i (exp.slug)}
		<ExperienceEntry
			experience={exp}
			color={getColor(exp, i)}
			hash={hashes[i]}
			index={i}
			expanded={expandedSlugs.has(exp.slug)}
			ontoggle={() => toggle(exp.slug)}
			isLast={false}
		/>
	{/each}
	<CommitRow
		hash={initialHash}
		color="var(--color-muted)"
		dotRadius={3}
		showLineAbove={true}
		showLineBelow={false}
		index={experiences.length}
	>
		<span class="font-mono text-xs text-muted">initial commit</span>
	</CommitRow>
</div>
