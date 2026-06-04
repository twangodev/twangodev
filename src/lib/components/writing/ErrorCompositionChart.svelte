<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart } from 'layerchart';
	import { scaleBand } from 'd3-scale';

	// Real per-dataset error rates for Gemma 4 E4B (our run, vLLM batched on RTX 6000 Pro).
	// Values are % of reference words (not % of total errors), so you can see
	// magnitude, not just composition. The insertion share still grows on noisy
	// speech, but text-first prompting keeps it far smaller than before.
	// Ordered worst → best WER.
	const data = [
		{ dataset: 'AMI', substitutions: 9.2, insertions: 2.98, deletions: 6.76 },
		{ dataset: 'Earnings22', substitutions: 6.97, insertions: 3.3, deletions: 3.71 },
		{ dataset: 'GigaSpeech', substitutions: 6.31, insertions: 1.86, deletions: 2.94 },
		{ dataset: 'VoxPopuli', substitutions: 3.74, insertions: 2.2, deletions: 2.59 },
		{ dataset: 'LS Other', substitutions: 5.87, insertions: 0.61, deletions: 1.12 },
		{ dataset: 'SPGISpeech', substitutions: 2.39, insertions: 1.85, deletions: 0.63 },
		{ dataset: 'TED-LIUM', substitutions: 2.15, insertions: 0.62, deletions: 1.07 },
		{ dataset: 'LS Clean', substitutions: 2.29, insertions: 0.24, deletions: 0.52 }
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
		type as % of reference words. The insertion rate still climbs on noisy, spontaneous speech (AMI
		3%, Earnings22 3%), the signature of a language-model prior overriding weak acoustic evidence,
		but the lean text-first prompt keeps it modest; audio-first ordering pushes AMI past 20%. The
		12B is the outlier: its AMI insertion rate is <strong>64%</strong>, off this chart.
	</figcaption>
</figure>
