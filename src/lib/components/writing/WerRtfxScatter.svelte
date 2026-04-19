<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { ScatterChart, Tooltip } from 'layerchart';
	import { scaleLog } from 'd3-scale';

	// Competitor numbers from huggingface/open_asr_leaderboard en_shortform.csv (Apr 2026).
	// WER = LibriSpeech test-clean (apples-to-apples). Competitor RTFx = their suite-average
	// BATCHED throughput. Gemma runs are LS Clean RTFx, vLLM unbatched, RTX 6000 Pro Blackwell.
	const competitors = [
		{ model: 'Cohere', rtfx: 525, wer: 1.25 },
		{ model: 'Parakeet 0.6B v2', rtfx: 3386, wer: 1.69 },
		{ model: 'Phi-4 MM', rtfx: 151, wer: 1.69 },
		{ model: 'Whisper lg-v3', rtfx: 146, wer: 2.01 },
		{ model: 'Whisper med.en', rtfx: 182, wer: 3.02 },
		{ model: 'Whisper small.en', rtfx: 269, wer: 3.05 },
		{ model: 'Whisper base.en', rtfx: 321, wer: 4.25 },
		{ model: 'Whisper tiny.en', rtfx: 348, wer: 5.66 }
	];

	const ours = [
		{ model: 'Gemma 4 E4B', rtfx: 28.1, wer: 4.17 },
		{ model: 'Gemma 4 E2B', rtfx: 40.6, wer: 5.24 }
	];

	const config = {
		competitor: { label: 'Open ASR Leaderboard (batched)', color: 'var(--color-muted)' },
		ours: { label: 'Gemma 4 (this run, unbatched)', color: 'var(--color-accent)' }
	} satisfies Chart.ChartConfig;

	type Point = { model: string; rtfx: number; wer: number };
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<Chart.Container {config} class="h-80 w-full">
		<ScatterChart
			x="rtfx"
			y="wer"
			xScale={scaleLog()}
			xDomain={[20, 4000]}
			series={[
				{
					key: 'competitor',
					label: config.competitor.label,
					data: competitors,
					color: config.competitor.color
				},
				{ key: 'ours', label: config.ours.label, data: ours, color: config.ours.color }
			]}
			legend
			props={{
				xAxis: {
					format: (d: number) => `${d}×`,
					ticks: [30, 100, 300, 1000, 3000]
				},
				yAxis: {
					format: (d: number) => `${d}%`
				}
			}}
		>
			{#snippet tooltip()}
				<Tooltip.Root variant="none">
					{#snippet children({ data }: { data: Point })}
						<div
							class="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
						>
							<div class="font-semibold text-text">{data.model}</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted">WER</span>
								<span class="font-mono text-text tabular-nums">{data.wer}%</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted">RTFx</span>
								<span class="font-mono text-text tabular-nums">{data.rtfx}×</span>
							</div>
						</div>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</ScatterChart>
	</Chart.Container>

	<figcaption class="text-sm leading-relaxed text-muted">
		LibriSpeech <code>test-clean</code> WER vs RTFx, log x-axis. Competitor RTFx is
		<strong>batched</strong> leaderboard throughput; our Gemma runs are
		<strong>unbatched, one-at-a-time</strong> on an RTX 6000 Pro Blackwell (96 GB). The Gemma dots are
		a floor on speed — expect them to move right with real batching.
	</figcaption>
</figure>
