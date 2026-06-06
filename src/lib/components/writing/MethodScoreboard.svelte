<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	type Category = 'baseline' | 'tried' | 'oracle';

	// Overall WER on the 126-clip human-reviewed dev set, lower is better.
	// Sorted ascending by WER. Each method belongs to exactly one category, so the
	// bar gets that category's color via three series where the other two are 0.
	const raw: { method: string; wer: number; category: Category }[] = [
		{ method: 'oracle*', wer: 0.123, category: 'oracle' },
		{ method: 'ROVER', wer: 0.135, category: 'baseline' },
		{ method: 'per-clip', wer: 0.239, category: 'tried' },
		{ method: 'select-best', wer: 0.243, category: 'tried' },
		{ method: 'span-lock', wer: 0.275, category: 'tried' },
		{ method: 're-fuse', wer: 0.333, category: 'tried' }
	];

	const data = raw.map((d) => ({
		method: d.method,
		baseline: d.category === 'baseline' ? d.wer : 0,
		tried: d.category === 'tried' ? d.wer : 0,
		oracle: d.category === 'oracle' ? d.wer : 0
	}));

	const categoryLabel: Record<Category, string> = {
		baseline: 'baseline',
		tried: 'tried',
		oracle: 'oracle'
	};

	const headers = ['Method', 'Overall WER', 'Category'];
	const rows = raw.map((d) => [d.method, d.wer.toFixed(3), categoryLabel[d.category]]);

	const caption =
		'Overall word error rate by fusion method on the 126-clip human-reviewed dev set, lower is better, sorted ascending. Every text-only LLM method (per-clip 0.239, select-best 0.243, span-lock 0.275, re-fuse 0.333) is worse than plain ROVER (0.135). Only an unattainable per-clip LLM routed by a perfect oracle (oracle* 0.123) edges the vote, because the disputed slots need the audio, which the text methods do not have.';

	export const agentText: AgentText = () => `${caption}\n\n${markdownTable(headers, rows)}`;
</script>

<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import ChartA11yTable from './ChartA11yTable.svelte';

	const config = {
		baseline: { label: 'ROVER (the vote)', color: 'var(--color-chart-2)' },
		tried: { label: 'LLM fusion (text only)', color: 'var(--color-chart-3)' },
		oracle: { label: 'LLM + perfect router*', color: 'var(--color-chart-4)' }
	} satisfies Chart.ChartConfig;
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div aria-hidden="true" class="contents">
		<Chart.Container {config} class="h-80 w-full">
			<BarChart
				{data}
				xScale={scaleBand().padding(0.25)}
				x="method"
				axis="x"
				seriesLayout="stack"
				legend
				series={[
					{ key: 'baseline', label: config.baseline.label, color: config.baseline.color },
					{ key: 'tried', label: config.tried.label, color: config.tried.color },
					{ key: 'oracle', label: config.oracle.label, color: config.oracle.color }
				]}
				props={{
					yAxis: {
						format: (d: number) => d.toFixed(3)
					},
					bars: {
						rounded: 'edge'
					}
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</BarChart>
		</Chart.Container>
	</div>

	<ChartA11yTable {headers} {rows} />

	<figcaption class="text-sm leading-relaxed text-muted">
		Overall word error rate by fusion method on the 126-clip human-reviewed dev set, lower is
		better. Every text-only method is worse than the vote; only an unattainable perfect router (<strong
			>oracle*</strong
		>) edges it, because the disputed slots need the audio, which text methods do not have.
	</figcaption>
</figure>
