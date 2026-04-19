<script lang="ts">
	// Competitor numbers from huggingface/open_asr_leaderboard en_shortform.csv (Apr 2026).
	// Gemma 4 E2B / E4B numbers are from our runs (vLLM, unbatched, RTX 6000 Pro) in
	// static/data/gemma4-audio/eval_results/.
	const models = [
		'Cohere',
		'Parakeet 0.6B v2',
		'Phi-4 MM',
		'Whisper lg-v3',
		'Whisper base.en',
		'Gemma 4 E2B',
		'Gemma 4 E4B'
	];
	// last two columns = ours
	const selfCols = new Set([models.length - 2, models.length - 1]);

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

	// rows = datasets, cols = models
	const wer: number[][] = [
		// AMI
		[8.13, 11.16, 11.09, 15.95, 21.13, 202.25, 41.31],
		// Earnings22
		[10.86, 11.15, 10.16, 11.29, 15.09, 26.59, 18.7],
		// GigaSpeech
		[9.34, 9.74, 9.33, 10.02, 12.83, 18.83, 13.76],
		// LS Clean
		[1.25, 1.69, 1.69, 2.01, 4.25, 5.24, 4.17],
		// LS Other
		[2.37, 3.19, 3.82, 3.91, 10.35, 11.99, 9.94],
		// SPGISpeech
		[3.08, 2.17, 3.06, 2.94, 4.26, 7.52, 6.4],
		// TED-LIUM
		[2.49, 3.38, 2.94, 3.86, 4.87, 6.97, 5.85],
		// VoxPopuli
		[5.87, 5.95, 6.04, 9.54, 9.76, 10.9, 9.85]
	];

	// Green → red ramp in oklch. 0% WER → green, >25% WER → red, caps.
	function cellColor(w: number): string {
		const t = Math.min(1, w / 25);
		return `color-mix(in oklch, oklch(0.78 0.18 145) ${Math.round((1 - t) * 100)}%, oklch(0.62 0.22 25))`;
	}

	function textColor(w: number): string {
		return w >= 15 ? 'white' : 'var(--color-text)';
	}

	function fmt(w: number): string {
		return w >= 100 ? w.toFixed(0) : w.toFixed(2);
	}

	// E2B → E4B relative improvement per dataset (last two columns of each row).
	// Tinted on a separate blue ramp so it reads as an annotation, not a WER value.
	function gainColor(g: number): string {
		const t = Math.min(1, g / 80);
		return `color-mix(in oklch, var(--color-subtle) ${Math.round((1 - t) * 100)}%, oklch(0.62 0.18 250))`;
	}

	function gainTextColor(g: number): string {
		return g >= 40 ? 'white' : 'var(--color-text)';
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
					<th class="px-2 py-1 text-center font-normal text-muted">E4B gain</th>
				</tr>
			</thead>
			<tbody>
				{#each datasets as ds, r (ds)}
					{@const e2b = wer[r][models.length - 2]}
					{@const e4b = wer[r][models.length - 1]}
					{@const gain = (100 * (e2b - e4b)) / e2b}
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
						<td
							class="rounded-sm px-2 py-1.5 text-center tabular-nums"
							style:background-color={gainColor(gain)}
							style:color={gainTextColor(gain)}
						>
							+{gain.toFixed(1)}%
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<figcaption class="text-sm leading-relaxed text-muted">
		WER (%) across the Open ASR short-form suite — lower is better. Competitor numbers from the Open
		ASR Leaderboard (Apr 2026); Gemma 4 E2B and E4B are our runs on vLLM (one request at a time, RTX
		6000 Pro Blackwell 96 GB). Gemma columns outlined. The rightmost column is E4B's relative WER
		improvement over E2B — note the gain scales with dataset difficulty (AMI gets +79.6%, clean
		datasets get ~15–20%).
	</figcaption>
</figure>
