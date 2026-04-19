<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';

	// Real per-dataset error rates for Gemma 4 E4B (our run, vLLM unbatched on RTX 6000 Pro).
	// Values are % of reference words (not % of total errors) — so you can see
	// magnitude, not just composition. AMI still has the largest insertion share.
	const data = [
		{ dataset: 'AMI', substitutions: 13.16, insertions: 20.42, deletions: 7.73 },
		{ dataset: 'Earnings22', substitutions: 9.09, insertions: 4.76, deletions: 4.84 },
		{ dataset: 'GigaSpeech', substitutions: 7.36, insertions: 2.67, deletions: 3.74 },
		{ dataset: 'VoxPopuli', substitutions: 4.37, insertions: 2.34, deletions: 3.14 },
		{ dataset: 'LS Other', substitutions: 7.29, insertions: 0.96, deletions: 1.69 },
		{ dataset: 'SPGISpeech', substitutions: 3.23, insertions: 2.04, deletions: 1.13 },
		{ dataset: 'TED-LIUM', substitutions: 2.79, insertions: 1.07, deletions: 1.99 },
		{ dataset: 'LS Clean', substitutions: 2.84, insertions: 0.49, deletions: 0.84 }
	];

	const config = {
		substitutions: { label: 'Substitutions', color: 'var(--color-chart-3)' },
		insertions: { label: 'Insertions', color: 'var(--color-chart-1)' },
		deletions: { label: 'Deletions', color: 'var(--color-chart-2)' }
	} satisfies Chart.ChartConfig;
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<Chart.Container {config} class="h-80 w-full">
		<BarChart
			{data}
			xScale={scaleBand().padding(0.25)}
			x="dataset"
			axis="x"
			seriesLayout="stack"
			legend
			series={[
				{
					key: 'substitutions',
					label: config.substitutions.label,
					color: config.substitutions.color
				},
				{ key: 'insertions', label: config.insertions.label, color: config.insertions.color },
				{ key: 'deletions', label: config.deletions.label, color: config.deletions.color }
			]}
			props={{
				yAxis: {
					format: (d: number) => `${d}%`
				}
			}}
		>
			{#snippet tooltip()}
				<Chart.Tooltip />
			{/snippet}
		</BarChart>
	</Chart.Container>
	<figcaption class="text-sm leading-relaxed text-muted">
		Error composition for Gemma 4 E4B by dataset, ordered worst to best WER. Bars show each error
		type as % of reference words. The insertion rate balloons on noisy, spontaneous speech (AMI 20%,
		Earnings22 5%) — the signature of a language-model prior overriding weak acoustic evidence. The
		smaller E2B model's AMI insertion rate is <strong>180%</strong>, off-chart.
	</figcaption>
</figure>
