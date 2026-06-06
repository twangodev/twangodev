<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	// Published "confidence" score over all 531,050 labeled rows, 20 bins across 0..1.
	// Bins below 0.15 are empty, so the histogram starts at 0.15. Counts are verbatim
	// from the labeling run; the score ranks rows, it is not a calibrated probability.
	const bins = [
		{ binStart: 0.15, count: 53795 },
		{ binStart: 0.2, count: 30910 },
		{ binStart: 0.25, count: 32540 },
		{ binStart: 0.3, count: 22303 },
		{ binStart: 0.35, count: 24392 },
		{ binStart: 0.4, count: 24380 },
		{ binStart: 0.45, count: 25882 },
		{ binStart: 0.5, count: 30767 },
		{ binStart: 0.55, count: 32280 },
		{ binStart: 0.6, count: 35452 },
		{ binStart: 0.65, count: 41677 },
		{ binStart: 0.7, count: 40422 },
		{ binStart: 0.75, count: 41523 },
		{ binStart: 0.8, count: 37648 },
		{ binStart: 0.85, count: 28195 },
		{ binStart: 0.9, count: 15830 },
		{ binStart: 0.95, count: 13054 }
	];

	const TOTAL = 531050;
	const BIN_WIDTH = 0.05;

	function keptAbove(cutoff: number): number {
		return bins.reduce((sum, b) => {
			const binEnd = b.binStart + BIN_WIDTH;
			if (cutoff <= b.binStart) return sum + b.count;
			if (cutoff >= binEnd) return sum;
			return sum + (b.count * (binEnd - cutoff)) / BIN_WIDTH;
		}, 0);
	}

	const headers = ['confidence >=', 'rows', '% kept'];
	// One row per achievable cutoff, kept = sum of bins at or above that cutoff.
	const rows = bins.map((b) => {
		const kept = keptAbove(b.binStart);
		return [b.binStart.toFixed(2), kept, ((kept / TOTAL) * 100).toFixed(1)];
	});

	const caption =
		'Distribution of the published confidence score across all 531,050 labeled rows, 20 bins over 0..1 (bins below 0.15 are empty). The table sweeps the cutoff: each row is a threshold and the number of rows kept at or above it. Confidence ranks rather than calibrates, on the hardest reviewed slice the accept rate is ~91% at >=0.8 and ~97% at >=0.9, so the true accept rate across the full set is higher. Drag the cutoff to trade volume against precision.';

	export const agentText: AgentText = () => `${caption}\n\n${markdownTable(headers, rows)}`;
</script>

<script lang="ts">
	import ChartA11yTable from './ChartA11yTable.svelte';

	const maxCount = Math.max(...bins.map((b) => b.count));

	let cutoff = $state(0.8);

	const bars = $derived(
		bins.map((b) => {
			const binEnd = b.binStart + BIN_WIDTH;
			const keptFraction =
				cutoff <= b.binStart ? 1 : cutoff >= binEnd ? 0 : (binEnd - cutoff) / BIN_WIDTH;
			return { binStart: b.binStart, heightPct: (b.count / maxCount) * 100, keptFraction };
		})
	);

	const keptRows = $derived(Math.round(keptAbove(cutoff)));
	const pct = $derived(((keptRows / TOTAL) * 100).toFixed(1));
	const cutoffLabel = $derived(cutoff.toFixed(2));
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div class="relative">
		<div aria-hidden="true" class="flex flex-col gap-1.5">
			<div class="flex h-72 items-end gap-1 border-b border-subtle">
				{#each bars as bar (bar.binStart)}
					<div
						class="relative flex-1 overflow-hidden rounded-t-sm"
						style:height="{bar.heightPct}%"
						style:background-color="var(--color-muted)"
					>
						<div
							class="absolute inset-0 transition-opacity duration-200 ease-out"
							style:background-color="var(--color-chart-1)"
							style:opacity={bar.keptFraction}
						></div>
					</div>
				{/each}
			</div>
			<div class="flex justify-between font-mono text-xs text-muted tabular-nums">
				<span>0.15</span>
				<span>0.55</span>
				<span>0.95</span>
			</div>
		</div>
		<div
			class="absolute top-0 right-0 z-10 flex items-baseline gap-x-3 font-mono text-xs tabular-nums"
		>
			<span class="text-text">≥ {cutoffLabel}</span>
			<span class="font-medium text-text">{keptRows.toLocaleString('en-US')} rows</span>
			<span class="text-muted">{pct}%</span>
		</div>
	</div>

	<label class="flex flex-col gap-2 font-mono text-xs text-muted">
		<span>
			cutoff <span class="text-text tabular-nums">{cutoffLabel}</span>
		</span>
		<input
			type="range"
			min="0.15"
			max="0.95"
			step="0.01"
			bind:value={cutoff}
			aria-label="confidence cutoff"
			class="confidence-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-subtle"
		/>
	</label>

	<ChartA11yTable {headers} {rows} />

	<figcaption class="text-sm leading-relaxed text-muted">
		Distribution of the published <code>confidence</code> score across all
		<strong>531,050</strong> labeled rows, 20 bins over 0..1 (bins below 0.15 are empty). Drag the
		cutoff to split the histogram: bars at or above it are
		<span style:color="var(--color-chart-1)">kept</span>, the rest are
		<span style:color="var(--color-muted)">dropped</span>. The score
		<strong>ranks, it is not calibrated</strong>: on the hardest reviewed slice the accept rate is
		~91% at <code>&gt;=0.8</code> and ~97% at <code>&gt;=0.9</code>, so the true accept rate across
		the full set is higher. The cutoff is a volume-vs-precision dial, not a probability.
	</figcaption>
</figure>

<style>
	.confidence-range::-webkit-slider-thumb {
		appearance: none;
		height: 1rem;
		width: 1rem;
		border-radius: 9999px;
		background: var(--color-chart-1);
		border: 2px solid var(--color-surface);
		box-shadow: 0 0 0 1px var(--color-subtle);
		cursor: pointer;
	}

	.confidence-range::-moz-range-thumb {
		height: 1rem;
		width: 1rem;
		border-radius: 9999px;
		background: var(--color-chart-1);
		border: 2px solid var(--color-surface);
		box-shadow: 0 0 0 1px var(--color-subtle);
		cursor: pointer;
	}

	.confidence-range:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
	}
</style>
