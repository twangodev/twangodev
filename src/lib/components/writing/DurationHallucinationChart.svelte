<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { BarChart, Tooltip } from 'layerchart';
	import { scaleLog } from 'd3-scale';

	// Computed from static/data/gemma4-audio/eval_results/ across all 8 datasets,
	// bucketed by audio_duration_s. Values are MEAN WER (%) per bucket.
	const data = [
		{ bucket: '<1s', e2b: 2202.97, e4b: 220.02, n: 6232 },
		{ bucket: '1–2s', e2b: 63.01, e4b: 53.31, n: 4623 },
		{ bucket: '2–3s', e2b: 28.17, e4b: 27.03, n: 4357 },
		{ bucket: '3–4s', e2b: 22.49, e4b: 22.29, n: 3942 },
		{ bucket: '4–6s', e2b: 15.74, e4b: 12.4, n: 12181 },
		{ bucket: '6–8s', e2b: 10.17, e4b: 8.9, n: 16350 },
		{ bucket: '8–11s', e2b: 9.07, e4b: 8.29, n: 20366 },
		{ bucket: '11–15s', e2b: 8.53, e4b: 7.28, n: 13989 },
		{ bucket: '15–20s', e2b: 10.5, e4b: 9.07, n: 801 },
		{ bucket: '20–30s', e2b: 13.6, e4b: 12.3, n: 332 },
		{ bucket: '30s+', e2b: 16.68, e4b: 15.35, n: 39 }
	];

	const config = {
		e2b: { label: 'E2B (2B)', color: 'var(--color-chart-1)' },
		e4b: { label: 'E4B (4B)', color: 'var(--color-accent)' }
	} satisfies Chart.ChartConfig;

	type Bucket = { bucket: string; e2b: number; e4b: number; n: number };
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
				{ key: 'e4b', label: config.e4b.label, color: config.e4b.color }
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
							<div class="flex items-center justify-between gap-4">
								<span class="flex items-center gap-1.5">
									<span
										class="inline-block h-2.5 w-2.5 rounded-[2px]"
										style:background-color="var(--color-chart-1)"
									></span>
									<span class="text-muted">E2B (2B)</span>
								</span>
								<span class="font-mono text-text tabular-nums">
									{data.e2b >= 100 ? data.e2b.toFixed(0) : data.e2b.toFixed(1)}%
								</span>
							</div>
							<div class="flex items-center justify-between gap-4">
								<span class="flex items-center gap-1.5">
									<span
										class="inline-block h-2.5 w-2.5 rounded-[2px]"
										style:background-color="var(--color-accent)"
									></span>
									<span class="text-muted">E4B (4B)</span>
								</span>
								<span class="font-mono text-text tabular-nums">
									{data.e4b >= 100 ? data.e4b.toFixed(0) : data.e4b.toFixed(1)}%
								</span>
							</div>
						</div>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</Chart.Container>
	<figcaption class="text-sm leading-relaxed text-muted">
		Mean WER (%, log scale) by audio-duration bucket, across all 8 Open ASR short-form datasets
		(93k+ samples). The U-shape is sharp at the short end: sub-1s E2B hits
		<strong>2,203%</strong> mean WER with a 1,766% insertion rate and an 8.7% refusal rate. E4B still
		broken at 220% but an order of magnitude better. Everything ≥3s is roughly fine.
	</figcaption>
</figure>
