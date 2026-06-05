<script module lang="ts">
	import type { AgentText } from '$lib/writing/agent-text';
	import { markdownTable } from '$lib/writing/agent-table';

	// Competitor numbers from huggingface/open_asr_leaderboard en_shortform.csv (Apr 2026).
	// Gemma 4 E2B / E4B / 12B numbers are from our runs (vLLM, batched, text-first prompt,
	// RTX 6000 Pro Blackwell 96 GB) in static/data/gemma4-audio/eval_results/.
	const models = [
		'Cohere',
		'Parakeet 0.6B v2',
		'Phi-4 MM',
		'Whisper lg-v3',
		'Whisper base.en',
		'Gemma 4 E2B',
		'Gemma 4 E4B',
		'Gemma 4 12B'
	];
	// last three columns = ours
	const selfCols = new Set([models.length - 3, models.length - 2, models.length - 1]);

	const datasets = [
		'AMI',
		'Earnings22',
		'GigaSpeech',
		'LS Clean',
		'LS Other',
		'SPGISpeech',
		'TED-LIUM',
		'VoxPopuli'
	];

	// rows = datasets, cols = models (5 competitors, then E2B / E4B / 12B)
	const wer: number[][] = [
		[8.13, 11.16, 11.09, 15.95, 21.13, 20.81, 18.95, 104.41],
		[10.86, 11.15, 10.16, 11.29, 15.09, 15.44, 13.98, 50.4],
		[9.34, 9.74, 9.33, 10.02, 12.83, 11.81, 11.11, 23.91],
		[1.25, 1.69, 1.69, 2.01, 4.25, 3.7, 3.05, 3.85],
		[2.37, 3.19, 3.82, 3.91, 10.35, 8.69, 7.61, 14.75],
		[3.08, 2.17, 3.06, 2.94, 4.26, 5.47, 4.86, 54.04],
		[2.49, 3.38, 2.94, 3.86, 4.87, 4.41, 3.85, 8.62],
		[5.87, 5.95, 6.04, 9.54, 9.76, 9.09, 8.54, 9.41]
	];

	function fmt(w: number): string {
		return w >= 100 ? w.toFixed(0) : w.toFixed(2);
	}

	const caption =
		'WER (%) across the Open ASR short-form suite, lower is better. Competitor numbers from the Open ASR Leaderboard (Apr 2026); Gemma 4 E2B, E4B and 12B are our runs on vLLM (batched, text-first prompt, RTX 6000 Pro Blackwell 96 GB), Gemma columns outlined. E4B is the strongest of the three and E2B trails it by ~10–15%; both stay within a few points of the dedicated models on clean read speech. The 12B keeps pace on LS Clean but degrades sharply on everything harder (AMI 104%, Earnings22 50%, SPGISpeech 54%). At the top, more scale stops helping.';

	export const agentText: AgentText = () => {
		const headers = ['Dataset / Model', ...models];
		const rows = datasets.map((ds, r) => [ds, ...wer[r].map(fmt)]);
		return `${caption}\n\n${markdownTable(headers, rows)}`;
	};
</script>

<script lang="ts">
	// Green → red ramp in oklch. 0% WER → green, >25% WER → red, caps.
	function cellColor(w: number): string {
		const t = Math.min(1, w / 25);
		return `color-mix(in oklch, oklch(0.78 0.18 145) ${Math.round((1 - t) * 100)}%, oklch(0.62 0.22 25))`;
	}

	function textColor(w: number): string {
		return w >= 15 ? 'white' : 'var(--color-text)';
	}
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div class="overflow-x-auto">
		<table class="w-full border-separate border-spacing-1 font-mono text-xs">
			<thead>
				<tr>
					<th class="px-2 py-1 text-left font-normal text-muted">Dataset / Model</th>
					{#each models as m, i (m)}
						<th
							class="px-2 py-1 text-center font-normal {selfCols.has(i)
								? 'text-text'
								: 'text-muted'}"
						>
							{m}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each datasets as ds, r (ds)}
					<tr>
						<td class="px-2 py-1 font-normal text-muted">{ds}</td>
						{#each wer[r] as v, c (c)}
							<td
								class="rounded-sm px-2 py-1.5 text-center tabular-nums {selfCols.has(c)
									? 'outline outline-1'
									: ''}"
								style:background-color={cellColor(v)}
								style:color={textColor(v)}
								style:outline-color={selfCols.has(c) ? 'var(--color-text)' : undefined}
							>
								{fmt(v)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<figcaption class="text-sm leading-relaxed text-muted">{caption}</figcaption>
</figure>
