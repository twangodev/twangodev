<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart, Tooltip } from 'layerchart';
	import { scaleLog } from 'd3-scale';

	// Computed from static/data/gemma4-audio/eval_results/ across all 8 datasets,
	// bucketed by audio_duration_s. Values are MEAN WER (%) per bucket.
	const data = [
		{ bucket: '<1s', e2b: 49.2, e4b: 41.9, b12: 667.4, n: 6232 },
		{ bucket: '1–2s', e2b: 38.2, e4b: 34.2, b12: 91.0, n: 4623 },
		{ bucket: '2–3s', e2b: 21.8, e4b: 19.9, b12: 52.7, n: 4357 },
		{ bucket: '3–4s', e2b: 17.4, e4b: 15.5, b12: 37.0, n: 3942 },
		{ bucket: '4–6s', e2b: 10.2, e4b: 9.2, b12: 40.0, n: 12181 },
		{ bucket: '6–8s', e2b: 7.5, e4b: 6.7, b12: 42.3, n: 16350 },
		{ bucket: '8–11s', e2b: 6.9, e4b: 6.2, b12: 42.1, n: 20366 },
		{ bucket: '11–15s', e2b: 6.5, e4b: 5.9, b12: 43.5, n: 13989 },
		{ bucket: '15–20s', e2b: 8.5, e4b: 7.6, b12: 18.0, n: 801 },
		{ bucket: '20–30s', e2b: 11.5, e4b: 10.8, b12: 13.0, n: 332 },
		{ bucket: '30s+', e2b: 15.0, e4b: 14.4, b12: 26.4, n: 39 }
	];

	const config = {
		e2b: { label: 'E2B (2B)', color: 'var(--color-chart-1)' },
		e4b: { label: 'E4B (4B)', color: 'var(--color-accent)' },
		b12: { label: '12B', color: 'var(--color-chart-3)' }
	} satisfies Chart.ChartConfig;

	type Bucket = { bucket: string; e2b: number; e4b: number; b12: number; n: number };

	const rows = [
		{ key: 'e2b', label: 'E2B (2B)', color: 'var(--color-chart-1)' },
		{ key: 'e4b', label: 'E4B (4B)', color: 'var(--color-accent)' },
		{ key: 'b12', label: '12B', color: 'var(--color-chart-3)' }
	] as const;
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<Chart.Container {config} class="h-96 w-full">
		<BarChart
			{data}
			x="bucket"
			yScale={scaleLog()}
			yDomain={[1, 2500]}
			series={[
				{ key: 'e2b', label: config.e2b.label, color: config.e2b.color },
				{ key: 'e4b', label: config.e4b.label, color: config.e4b.color },
				{ key: 'b12', label: config.b12.label, color: config.b12.color }
			]}
			seriesLayout="group"
			legend
			props={{
				yAxis: {
					format: (d: number) => `${d}%`,
					ticks: [1, 10, 100, 1000]
				}
			}}
		>
			{#snippet tooltip()}
				<Tooltip.Root variant="none">
					{#snippet children({ data }: { data: Bucket })}
						<div
							class="grid min-w-[12rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
						>
							<div class="flex items-baseline justify-between gap-4">
								<span class="font-semibold text-text">{data.bucket}</span>
								<span class="font-mono text-muted">n={data.n.toLocaleString()}</span>
							</div>
							{#each rows as row (row.key)}
								<div class="flex items-center justify-between gap-4">
									<span class="flex items-center gap-1.5">
										<span
											class="inline-block h-2.5 w-2.5 rounded-[2px]"
											style:background-color={row.color}
										></span>
										<span class="text-muted">{row.label}</span>
									</span>
									<span class="font-mono text-text tabular-nums">
										{(data[row.key] as number) >= 100
											? (data[row.key] as number).toFixed(0)
											: (data[row.key] as number).toFixed(1)}%
									</span>
								</div>
							{/each}
						</div>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</Chart.Container>
	<figcaption class="text-sm leading-relaxed text-muted">
		Mean WER (%, log scale) by audio-duration bucket, across all 8 Open ASR short-form datasets
		(93k+ samples). The U-shape persists, but the story is the model size: switching to the model
		card's text-first prompt holds the small models together at the short end (sub-1s E2B is <strong
			>49%</strong
		>; audio-first ordering produces 2,203% on the same clips), while the
		<strong>12B is worse at every single bucket</strong>:
		<strong>667%</strong> on sub-1s clips and still ~42% even on the comfortable 6–15s range. The largest
		model degrades the most.
	</figcaption>
</figure>
