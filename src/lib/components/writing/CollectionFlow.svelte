<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';

	interface Node {
		name: string;
		href: string;
		label: string;
		sub: string;
		stat: string;
		repo: string;
	}

	const nodes: Node[] = [
		{
			name: 'tartanaviation-atc-adsb',
			href: 'https://huggingface.co/datasets/twangodev/tartanaviation-atc-adsb',
			label: 'clips',
			sub: 'paired ATC audio + ADS-B',
			stat: '~41.8k clips',
			repo: 'https://github.com/twangodev/squawk'
		},
		{
			name: 'tartanaviation-atc-adsb-utterances',
			href: 'https://huggingface.co/datasets/twangodev/tartanaviation-atc-adsb-utterances',
			label: 'utterances',
			sub: 'VAD-split segments + ADS-B',
			stat: '531,050 · ~398h',
			repo: 'https://github.com/twangodev/squawk'
		},
		{
			name: 'tartanaviation-atc-labels',
			href: 'https://huggingface.co/datasets/twangodev/tartanaviation-atc-labels',
			label: 'labels',
			sub: 'transcript + confidence',
			stat: '531,050 · 25MB',
			repo: 'https://github.com/twangodev/readback'
		}
	];

	const connectors = ['VAD split', 'ensemble ASR, vote, snap'];

	export const agentText: AgentText = () =>
		[
			'The TartanAviation ATC collection on Hugging Face, built by squawk (https://github.com/twangodev/squawk) mirroring CMU TartanAviation:',
			'',
			...nodes.map(
				(n) => `- **${n.name}**, ${n.label}, ${n.sub} (${n.stat}): ${n.href} (repo ${n.repo})`
			)
		].join('\n');
</script>

<script lang="ts">
	import { SiGithub, SiHuggingface } from '@icons-pack/svelte-simple-icons';

	// Cards alternate left, right, left. The connector below card i sweeps a wide
	// S-curve from that card's center toward the next card on the opposite side.
	const left = (i: number) => i % 2 === 0;
	const sweep = (i: number) =>
		left(i) ? 'M20 0 C 20 72, 80 28, 80 100' : 'M80 0 C 80 72, 20 28, 20 100';
</script>

<figure class="not-prose my-8 flex flex-col">
	{#each nodes as node, i (node.name)}
		<div class="relative w-2/5 {left(i) ? 'mr-auto -rotate-1' : 'ml-auto rotate-1'}">
			<div class="flex flex-col gap-1.5 rounded-sm border border-subtle bg-surface/40 px-4 py-3">
				<div
					class="font-mono text-xs leading-none font-semibold tracking-tight text-text tabular-nums"
				>
					{node.label}
				</div>
				<div class="font-mono text-xs leading-tight tracking-wide text-muted">{node.sub}</div>
				<div
					class="mt-0.5 font-mono text-xs leading-tight font-medium tracking-tight text-text/90 tabular-nums"
				>
					{node.stat}
				</div>
			</div>
			<div class="absolute top-2 right-2 z-10 flex items-center gap-1.5">
				<a
					href={node.href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="{node.name} dataset on Hugging Face"
					class="rounded-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					<SiHuggingface size={14} aria-hidden="true" />
				</a>
				<a
					href={node.repo}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="{node.repo.split('/').pop()} repository on GitHub"
					class="rounded-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
				>
					<SiGithub size={14} aria-hidden="true" />
				</a>
			</div>
		</div>

		{#if i < connectors.length}
			<div class="relative h-20 w-full" aria-hidden="true">
				<svg
					class="absolute inset-0 h-full w-full text-muted/70"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				>
					<path d={sweep(i)} vector-effect="non-scaling-stroke" />
				</svg>
				<span
					class="absolute top-1/2 left-1/2 max-w-[13rem] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-surface px-2 py-0.5 text-center font-mono text-xs leading-tight tracking-wide text-balance text-muted"
				>
					{connectors[i]}
				</span>
			</div>
		{/if}
	{/each}

	<figcaption class="mt-3 text-sm leading-relaxed text-muted">
		The three-stage TartanAviation ATC collection on Hugging Face, built by
		<a href="https://github.com/twangodev/squawk" target="_blank" rel="noopener noreferrer"
			>squawk</a
		>
		mirroring CMU TartanAviation. Raw <strong>clips</strong> (~41.8k paired ATC audio + ADS-B) are
		VAD-split into <strong>531,050 utterances</strong> (~398h), then run through ensemble ASR,
		ROVER, ADS-B snap, and review to produce the <strong>labels</strong> dataset (531,050 rows, 25MB),
		the subject of this post.
	</figcaption>
</figure>
