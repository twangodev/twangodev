<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		hash: string;
		color: string;
		dotRadius?: number;
		showLineAbove?: boolean;
		showLineBelow?: boolean;
		index?: number;
		children: Snippet;
	}

	let {
		hash,
		color,
		dotRadius = 5,
		showLineAbove = true,
		showLineBelow = true,
		index = 0,
		children
	}: Props = $props();

	const MAIN_X = 12;
	const SVG_W = 40;
</script>

<div class="flex w-full items-center gap-3">
	<!-- Graph column -->
	<div class="relative shrink-0" style:width="{SVG_W}px" style:height="36px">
		<svg width={SVG_W} height="36" class="block" aria-hidden="true">
			{#if showLineAbove}
				<line x1={MAIN_X} y1="0" x2={MAIN_X} y2="18" stroke="var(--color-muted)" stroke-width="2" />
			{/if}
			{#if showLineBelow}
				<line
					x1={MAIN_X}
					y1="18"
					x2={MAIN_X}
					y2="36"
					stroke="var(--color-muted)"
					stroke-width="2"
				/>
			{/if}
			<circle
				cx={MAIN_X}
				cy="18"
				r={dotRadius}
				fill={color}
				class="commit-dot"
				style:--dot-delay="{index * 100 + 30}ms"
			/>
		</svg>
	</div>

	<!-- Content -->
	<div class="flex min-w-0 flex-1 items-center gap-3 py-2">
		<span class="shrink-0 font-mono text-xs text-muted">{hash}</span>
		{@render children()}
	</div>
</div>

<style>
	.commit-dot {
		transform-origin: center;
		transform: scale(0);
		animation: popIn 300ms ease-out forwards;
		animation-delay: var(--dot-delay);
	}

	@keyframes popIn {
		to {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.commit-dot {
			animation: none;
			transform: scale(1);
		}
	}
</style>
