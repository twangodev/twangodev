<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	type Category = 'baseline' | 'tried' | 'oracle';

	const raw: { method: string; wer: number; category: Category }[] = [
		{ method: 'oracle*', wer: 0.123, category: 'oracle' },
		{ method: 'ROVER', wer: 0.135, category: 'baseline' },
		{ method: 'per-clip', wer: 0.239, category: 'tried' },
		{ method: 'select-best', wer: 0.243, category: 'tried' },
		{ method: 'span-lock', wer: 0.275, category: 'tried' },
		{ method: 're-fuse', wer: 0.333, category: 'tried' }
	];

	const categoryLabel: Record<Category, string> = {
		baseline: 'baseline',
		tried: 'tried',
		oracle: 'oracle'
	};

	const headers = ['Method', 'Overall WER', 'Category'];
	const rows = raw.map((d) => [d.method, d.wer.toFixed(3), categoryLabel[d.category]]);

	const caption =
		'Overall word error rate by fusion method on the 126-clip human-reviewed dev set, lower is better, sorted ascending. Each dot is a method; the dashed line marks ROVER, the vote to beat, and every stem runs from that line to the dot, so its length is how far the method lands from the vote. Every text-only LLM method (per-clip 0.239, select-best 0.243, span-lock 0.275, re-fuse 0.333) sits to the right of the line, worse than the vote. Only an unattainable per-clip LLM routed by a perfect oracle (oracle* 0.123) edges left of it, because the disputed slots need the audio, which the text methods do not have.';

	export const agentText: AgentText = () => `${caption}\n\n${markdownTable(headers, rows)}`;
</script>

<script lang="ts">
	import { scaleLinear, scaleBand } from 'd3-scale';
	import ChartA11yTable from './ChartA11yTable.svelte';

	const categoryColor: Record<Category, string> = {
		baseline: 'var(--color-chart-2)',
		tried: 'var(--color-chart-3)',
		oracle: 'var(--color-chart-4)'
	};

	const legend: { category: Category; label: string }[] = [
		{ category: 'baseline', label: 'ROVER (the vote)' },
		{ category: 'oracle', label: 'LLM + perfect router*' },
		{ category: 'tried', label: 'LLM fusion (text only)' }
	];

	const roverWer = raw.find((d) => d.category === 'baseline')!.wer;

	const height = 320;
	const margin = { top: 32, right: 64, bottom: 44, left: 100 };
	const axisY = height - margin.bottom;
	const xDomain: [number, number] = [0.1, 0.35];

	let width = $state(0);

	const yScale = scaleBand()
		.domain(raw.map((d) => d.method))
		.range([margin.top, axisY])
		.padding(0.55);

	const xScale = $derived(
		scaleLinear()
			.domain(xDomain)
			.range([margin.left, Math.max(margin.left, width - margin.right)])
	);

	const ticks = $derived(
		width > 0 && width < 460 ? [0.1, 0.2, 0.3] : [0.1, 0.15, 0.2, 0.25, 0.3, 0.35]
	);

	const roverX = $derived(xScale(roverWer));

	const marks = $derived(
		raw.map((d) => {
			const cx = xScale(d.wer);
			const cy = (yScale(d.method) ?? 0) + yScale.bandwidth() / 2;
			const beatsVote = d.wer < roverWer;
			return {
				method: d.method,
				color: categoryColor[d.category],
				value: d.wer.toFixed(3),
				cx,
				cy,
				hasStem: d.category !== 'baseline',
				label: beatsVote
					? { x: cx + 2, y: cy - 11, anchor: 'end' as const }
					: { x: cx + 11, y: cy, anchor: 'start' as const }
			};
		})
	);
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div aria-hidden="true" class="contents">
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
			{#each legend as item (item.category)}
				<span class="flex items-center gap-1.5">
					<span
						class="inline-block size-2.5 rounded-[2px]"
						style:background-color={categoryColor[item.category]}
					></span>
					{item.label}
				</span>
			{/each}
		</div>

		<div class="w-full" bind:clientWidth={width} style:height="{height}px">
			{#if width > 0}
				<svg {width} {height} viewBox="0 0 {width} {height}" role="presentation">
					{#each ticks as t (t)}
						<line
							x1={xScale(t)}
							x2={xScale(t)}
							y1={margin.top}
							y2={axisY}
							stroke="var(--color-subtle)"
							stroke-width="1"
						/>
						<text
							x={xScale(t)}
							y={axisY + 18}
							text-anchor="middle"
							fill="var(--color-muted)"
							style="font-size:11px">{t.toFixed(2)}</text
						>
					{/each}

					<line
						x1={margin.left}
						x2={width - margin.right}
						y1={axisY}
						y2={axisY}
						stroke="var(--color-border)"
						stroke-width="1"
					/>
					<text
						x={(margin.left + width - margin.right) / 2}
						y={axisY + 36}
						text-anchor="middle"
						fill="var(--color-muted)"
						style="font-size:11px">word error rate (lower is better)</text
					>

					<line
						x1={roverX}
						x2={roverX}
						y1={margin.top - 6}
						y2={axisY}
						stroke="var(--color-chart-2)"
						stroke-width="1.5"
						stroke-dasharray="4 4"
					/>
					<text
						x={roverX}
						y={margin.top - 12}
						text-anchor="middle"
						fill="var(--color-chart-2)"
						style="font-size:11px;font-weight:500">the vote</text
					>
					<text
						x={width - margin.right}
						y={margin.top - 12}
						text-anchor="end"
						fill="var(--color-muted)"
						style="font-size:11px">worse →</text
					>

					{#each marks as m (m.method)}
						{#if m.hasStem}
							<line
								x1={roverX}
								x2={m.cx}
								y1={m.cy}
								y2={m.cy}
								stroke={m.color}
								stroke-width="2.5"
								stroke-linecap="round"
							/>
						{/if}
						<circle
							cx={m.cx}
							cy={m.cy}
							r="5.5"
							fill={m.color}
							stroke="var(--color-surface)"
							stroke-width="1.5"
						/>
						<text
							x={margin.left - 12}
							y={m.cy}
							text-anchor="end"
							dominant-baseline="middle"
							fill="var(--color-muted)"
							style="font-size:12px">{m.method}</text
						>
						<text
							x={m.label.x}
							y={m.label.y}
							text-anchor={m.label.anchor}
							dominant-baseline="middle"
							class="font-mono tabular-nums"
							fill="var(--color-text)"
							style="font-size:11px">{m.value}</text
						>
					{/each}
				</svg>
			{/if}
		</div>
	</div>

	<ChartA11yTable {headers} {rows} />

	<figcaption class="text-sm leading-relaxed text-muted">
		Overall word error rate by fusion method on the 126-clip human-reviewed dev set, lower is
		better. Each stem runs from the dashed <strong>vote</strong> line to the method's dot, so its
		length is how far that method lands from ROVER. Every text-only method sits to the right — worse
		than the vote; only an unattainable perfect router (<strong>oracle*</strong>) edges left of it,
		because the disputed slots need the audio, which text methods do not have.
	</figcaption>
</figure>
