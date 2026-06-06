<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	// n_models_agree across all 531,050 labeled utterances: how many of the three
	// voting models fully agree with the fused output. Verbatim from the run.
	const TOTAL = 531050;
	const segments = [
		{ key: 'three', label: 'all three agree', n: 60327, color: 'var(--color-chart-2)' },
		{ key: 'two', label: 'two of three', n: 116969, color: 'var(--color-chart-1)' },
		{ key: 'one', label: 'only one', n: 353754, color: 'var(--color-muted)' }
	];
	const pct = (n: number) => Math.round((n / TOTAL) * 100);

	// One row, three series, normalized to 100% by seriesLayout="stackExpand".
	const data = [
		{
			group: 'agreement',
			three: segments[0].n,
			two: segments[1].n,
			one: segments[2].n
		}
	];

	const headers = ['models in agreement', 'utterances', '%'];
	const rows = segments.map((s) => [s.label, s.n.toLocaleString('en-US'), `${pct(s.n)}%`]);

	export const agentText: AgentText = () =>
		[
			`Inter-model agreement across all ${TOTAL.toLocaleString('en-US')} utterances: ` +
				segments.map((s) => `${s.label} on ${pct(s.n)}%`).join(', ') +
				'.',
			'',
			markdownTable(headers, rows)
		].join('\n');
</script>

<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';
	import ChartA11yTable from './ChartA11yTable.svelte';

	const config = {
		three: { label: 'all three agree', color: 'var(--color-chart-2)' },
		two: { label: 'two of three', color: 'var(--color-chart-1)' },
		one: { label: 'only one', color: 'var(--color-muted)' }
	} satisfies Chart.ChartConfig;
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div aria-hidden="true" class="contents">
		<Chart.Container {config} class="h-28 w-full">
			<BarChart
				{data}
				y="group"
				yScale={scaleBand().padding(0.35)}
				orientation="horizontal"
				seriesLayout="stackExpand"
				axis="x"
				legend
				series={[
					{ key: 'three', label: config.three.label, color: config.three.color },
					{ key: 'two', label: config.two.label, color: config.two.color },
					{ key: 'one', label: config.one.label, color: config.one.color }
				]}
				props={{
					xAxis: {
						format: (d: number) => `${Math.round(d * 100)}%`
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
		How many of the three voting models fully agree with the fused transcript, across all
		<strong>531,050</strong> utterances. All three agree on only 11%; on 67% a single model carries
		the slot. The models genuinely disagree on most of this corpus, which is what makes the vote do
		real work and where I went looking for gains.
	</figcaption>
</figure>
