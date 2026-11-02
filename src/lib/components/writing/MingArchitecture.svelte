<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';
	import { createExplorer, statusText } from './ming-architecture/knowledge';

	import { variants, type Variant, type SceneProps } from './ming-architecture/model';
	const sourceUrl = 'https://github.com/twangodev/ming3-nvfp4/blob/main/docs/reproduction.md';

	export const agentText: AgentText = () =>
		[
			'Quantization scope: audio → encoder → projector, and text → embeddings, feed the Thinker. The text head predicts tokens; the optional, separate Talker consumes text and generates latents for AudioVAE to decode into speech.',
			'Only routed-expert gate_proj, up_proj, and down_proj linears use NVFP4 weights and activations (W4A4). Attention, routers, shared experts, dense layers, embeddings, norms, text head, audio components, and caches retain source precision. The optional speech path was not evaluated.',
			markdownTable(
				[
					'Model',
					'Decoder layers',
					'Dense layers',
					'NVFP4 expert layers',
					'BF16 expert layers',
					'Experts per MoE layer'
				],
				Object.values(variants).map((model) => [
					model.label,
					model.layers,
					model.dense,
					model.layers - model.dense - model.retained.length,
					model.retained.length,
					model.experts
				])
			),
			'Tiny retains routed-expert layers 5, 10, 15, 18, 20, 21, 22 in BF16 (zero-based). Eight routed experts are selected per token in either model. Each MoE layer also has one shared expert. Tiny uses MLA every fourth layer; Flash every sixth; other layers use KDA. All attention remains at source precision.',
			...['kda', 'mla', 'router', 'speech', 'mtp'].map((id) => {
				const topic = createExplorer('tiny', 1)[id];
				return `**${topic.title}:** ${topic.body} [Implementation](${topic.source.url}).`;
			}),
			`All decoder layers are shown. The single 3D scene supports nested inspection of audio features, encoder and projector, text embeddings, KDA and MLA, norms and residuals, routing and expert projections, text generation, Talker, AudioVAE, and the auxiliary MTP branch. MTP is unchanged and skipped by the evaluated audio wrapper. Operation-specific shapes unfold on hover and pin on click: layer stacks, tapered linear projections, weight matrices, convolution windows, expert banks, recurrent state, and arithmetic operators. Moving dots illustrate signal direction, not live activations or measured expert routing. Collapsed overview block volumes are proportional to original parameter counts (not quantized storage or active parameters), including auxiliary MTP and optional Talker/AudioVAE weights; non-learned buffers and the external speaker encoder are excluded. Inner grids and exploded spacing are schematic. [Quantization recipes and scope](${sourceUrl}).`
		].join('\n\n');
</script>

<script lang="ts">
	import { onMount, tick, type Component } from 'svelte';
	import { ArrowUpRight, ChevronRight } from '@lucide/svelte';
	import { mode } from 'mode-watcher';
	import { gridView, diagramHeight } from './ming-architecture/navigation';
	let variant = $state<Variant>('tiny'),
		path = $state<string[]>([]),
		preview = $state<string | null>(null);
	let viewportWidth = $state(670);
	const view = $derived(gridView(variant, path, viewportWidth));
	const active = $derived(preview ? view.topics[preview] : view.topic);
	let Scene = $state.raw<Component<SceneProps> | null>(null);
	let host: HTMLDivElement, figure: HTMLElement;
	let visible = $state(false),
		tabVisible = $state(true),
		reducedMotion = $state(false),
		ready = $state(false);
	const id = $props.id();
	async function open(topic: string) {
		if (path.at(-1) === topic) return;
		preview = null;
		path = [...path, topic];
		await tick();
		document.getElementById(`${id}-description`)?.focus({ preventScroll: true });
	}
	async function back(depth = path.length - 1) {
		preview = null;
		path = path.slice(0, Math.max(0, depth));
		await tick();
		document.getElementById(`${id}-description`)?.focus({ preventScroll: true });
	}
	function changeModel(next: Variant) {
		preview = null;
		path = [];
		variant = next;
	}
	onMount(() => {
		let destroyed = false;
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const syncMotion = () => (reducedMotion = motion.matches);
		const syncTab = () => (tabVisible = document.visibilityState === 'visible');
		syncMotion();
		syncTab();
		motion.addEventListener('change', syncMotion);
		document.addEventListener('visibilitychange', syncTab);
		const near = new IntersectionObserver(
			async ([entry]) => {
				if (!entry.isIntersecting) return;
				near.disconnect();
				const module = await import('./ming-architecture/Canvas.svelte');
				if (!destroyed) Scene = module.default;
			},
			{ rootMargin: '250px' }
		);
		const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
		near.observe(host);
		observer.observe(host);
		return () => {
			destroyed = true;
			near.disconnect();
			observer.disconnect();
			motion.removeEventListener('change', syncMotion);
			document.removeEventListener('visibilitychange', syncTab);
		};
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && path.length && figure?.contains(document.activeElement)) {
			event.preventDefault();
			void back();
		}
	}}
/>
<figure bind:this={figure} class="architecture not-prose my-8 text-text">
	<div class="heading">
		<p>Inside Ming 3 Audio</p>
		<div class="models" role="group" aria-label="Model">
			{#each Object.entries(variants) as [key, model] (key)}<button
					type="button"
					aria-pressed={variant === key}
					onclick={() => changeModel(key as Variant)}>{model.label}</button
				>{/each}
		</div>
	</div>
	<div class="diagram">
		{#if path.length}
			<nav aria-label="Component path">
				<button type="button" onclick={() => back(0)}>Model</button>
				{#each path as key, index (`${index}-${key}`)}<span
						class="breadcrumb-icon"
						aria-hidden="true"><ChevronRight size={12} strokeWidth={1.5} /></span
					><button
						type="button"
						aria-current={index === path.length - 1 ? 'page' : undefined}
						onclick={() => back(index + 1)}
						>{key.startsWith('layer:') ? view.topics[key].title : view.topics[key].short}</button
					>{/each}
			</nav>
		{:else}<p class="hint">Hover to unfold · click to explore</p>{/if}
		<div
			class="canvas-host"
			style:height={`${diagramHeight(view, viewportWidth)}px`}
			bind:this={host}
			bind:clientWidth={viewportWidth}
			data-ready={ready}
			role="group"
			aria-label="Interactive isometric model. Focus a component to preview it; Enter opens it and Escape goes back."
		>
			{#if Scene}
				<svelte:boundary>
					<Scene
						{view}
						dark={mode.current === 'dark'}
						{reducedMotion}
						visible={visible && tabVisible}
						onopen={open}
						onpreview={(topic) => (preview = topic)}
						onready={() => (ready = true)}
					/>
					{#snippet failed()}<p class="hint">Couldn’t load the diagram.</p>{/snippet}
				</svelte:boundary>
			{/if}
		</div>
	</div>
	<div
		id="{id}-description"
		class="description"
		tabindex="-1"
		aria-live="polite"
		aria-atomic="true"
	>
		<p>
			<strong>{active.title}</strong>{#if active.status !== 'source'}<span
					class="status"
					data-status={active.status}>{statusText[active.status]}</span
				>{/if}
		</p>
		<p class="summary">{active.body.split(/(?<=\.)\s/)[0]}</p>
	</div>
	{#if path.length}
		{#key view.key}
			<details class="explanation">
				<summary
					><span class="disclosure-icon" aria-hidden="true"
						><ChevronRight size={13} strokeWidth={1.75} /></span
					>How it works</summary
				>
				<p>{view.topic.body}</p>
				{#if view.topic.formula}<p class="formula">{view.topic.formula}</p>{/if}
				{#if view.topic.facts}<ul>
						{#each view.topic.facts as fact (fact)}<li>{fact}</li>{/each}
					</ul>{/if}
				<!-- Checkpoint citations are external URLs. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={view.topic.source.url} target="_blank" rel="noreferrer"
					>{view.topic.source.label}<ArrowUpRight
						size={13}
						strokeWidth={1.75}
						aria-hidden="true"
					/></a
				>
			</details>
		{/key}
	{/if}
	<figcaption>
		<span class="legend"
			><span><i class="nvfp4"></i>NVFP4</span><span><i class="bf16"></i>Retained BF16</span><span
				><i></i>Original</span
			></span
		>
		<span
			>{path.length
				? 'Illustrative flow · not live activations'
				: 'Volume ∝ original parameters'}</span
		>
	</figcaption>
</figure>

<style>
	.architecture {
		--nvfp4: #57ce70;
		--bf16: #e9ba45;
		font-size: 13px;
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.6rem;
		font-size: 13px;
		font-weight: 500;
	}
	.models {
		display: flex;
		gap: 2px;
		font-size: 11px;
		font-weight: 400;
	}
	.models button {
		padding: 5px 10px;
		border-radius: 3px;
	}
	.models button[aria-pressed='true'] {
		background: var(--color-text);
		color: var(--color-bg);
	}
	.diagram {
		position: relative;
		background: var(--color-bg);
		border: 1px solid var(--color-subtle);
		border-radius: 4px;
		overflow: hidden;
	}
	nav,
	.hint {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		height: 38px;
		padding: 0 0.8rem;
		font-size: 11px;
		white-space: nowrap;
		overflow-x: auto;
	}
	.hint {
		color: color-mix(in srgb, var(--color-text) 70%, var(--color-bg));
	}
	nav button[aria-current] {
		font-weight: 550;
	}
	.breadcrumb-icon {
		display: inline-flex;
		flex-shrink: 0;
		color: color-mix(in srgb, var(--color-text) 70%, var(--color-bg));
	}
	.canvas-host {
		height: 400px;
		isolation: isolate;
		position: relative;
	}
	.description {
		padding-top: 0.8rem;
		min-height: 80px;
		font-size: 12px;
		line-height: 1.6;
	}
	.description:focus {
		outline: none;
	}
	.description strong {
		font-weight: 550;
	}
	.summary {
		margin-top: 3px;
		color: color-mix(in srgb, var(--color-text) 80%, var(--color-bg));
	}
	.status {
		margin-left: 0.6rem;
		font-size: 10px;
	}
	.status[data-status='nvfp4'] {
		border-bottom: 2px solid var(--nvfp4);
	}
	.status[data-status='bf16'] {
		border-bottom: 2px solid var(--bf16);
	}
	.explanation {
		font-size: 12px;
		line-height: 1.7;
		padding-bottom: 0.6rem;
	}
	.explanation summary {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		width: max-content;
		list-style: none;
	}
	.explanation summary::-webkit-details-marker {
		display: none;
	}
	.disclosure-icon {
		display: inline-flex;
		transition: transform 140ms ease;
	}
	.explanation[open] .disclosure-icon {
		transform: rotate(90deg);
	}
	@media (prefers-reduced-motion: reduce) {
		.disclosure-icon {
			transition: none;
		}
	}
	.explanation p,
	.explanation ul {
		margin-top: 0.7rem;
	}
	.explanation li {
		list-style: disc;
		margin-left: 1.2rem;
	}
	.explanation a {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.6rem;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.formula {
		font-family: var(--font-mono);
		font-size: 11px;
		overflow-x: auto;
		padding: 0.5rem;
		background: var(--color-surface);
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		font-size: 10px;
		color: color-mix(in srgb, var(--color-text) 70%, var(--color-bg));
	}
	.legend {
		display: flex;
		gap: 0.7rem;
	}
	.legend > span {
		display: flex;
		gap: 5px;
		align-items: center;
	}
	i {
		display: inline-block;
		width: 7px;
		height: 7px;
		border: 1px solid currentColor;
		border-radius: 1px;
	}
	i.nvfp4 {
		background: var(--nvfp4);
		border-color: var(--nvfp4);
	}
	i.bf16 {
		background: var(--bf16);
		border-color: var(--bf16);
	}
	button {
		cursor: pointer;
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--color-text);
		outline-offset: 3px;
	}
	@media (max-width: 480px) {
		.canvas-host {
			height: 360px;
		}
		.description {
			min-height: 96px;
		}
	}
</style>
