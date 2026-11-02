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

	function fmt(w: number | null): string {
		if (w === null) return '—';
		return w >= 100 ? w.toFixed(0) : w.toFixed(2);
	}

	const caption =
		'WER (%) across the Open ASR short-form suite, lower is better. Competitor numbers from the Open ASR Leaderboard (Apr 2026); Gemma 4 E2B, E4B and 12B are our runs on vLLM (batched, text-first prompt, RTX 6000 Pro Blackwell 96 GB), Gemma columns outlined. E4B is the strongest of the three and E2B trails it by ~10–15%; both stay within a few points of the dedicated models on clean read speech. The 12B keeps pace on LS Clean but degrades sharply on everything harder (AMI 104%, Earnings22 50%, SPGISpeech 54%). At the top, more scale stops helping.';

	const suites = {
		gemma4: {
			models,
			datasets,
			scores: wer,
			selfCols,
			caption,
			higherIsBetter: new Set<number>()
		},
		ming3: {
			models: [
				'Tiny BF16 (local)',
				'Tiny NVFP4 (local)',
				'Flash NVFP4 (local)',
				'Flash (published)',
				'Seed2.0 Lite (published)',
				'Qwen3.8-Omni Flash (published)',
				'Gemini 3.8 Flash (published)'
			],
			datasets: [
				'FLEURS English',
				'FLEURS Chinese',
				'LibriSpeech clean',
				'LibriSpeech other',
				'MMAU mini',
				'MMAR',
				'MMSU',
				'MMLU-Pro'
			],
			scores: [
				[3.2905131551830733, 3.4416431957134024, 2.919557601154084, 2.86, 2.75, 3.58, 3.29],
				[3.5242290748898677, 3.4343844191977744, 3.4546719220959887, 2.92, 4.89, 3.76, 7.31],
				[1.4238029682991684, 1.4426612857600845, 1.2031606540064494, 1.2, 1.07, 1.25, 1.96],
				[3.0426231988200145, 3.0709882379637685, 2.4507393820203474, 2.4, 2.17, 2.64, 4.46],
				[76.7, 77.3, 78.2, 82.0, 77.2, 82.3, 78.2],
				[63.9, 65.2, 69.5, 74.4, 77.7, 78.6, 81.0],
				[68.04, 67.14, 77.8, 78.82, 82.1, 80.84, 83.39],
				[61.427859042553195, 60.164561170212764, 75.24102393617021, 80.0, null, 87.7, null]
			],
			selfCols: new Set([1, 2]),
			higherIsBetter: new Set([4, 5, 6, 7]),
			caption:
				'Scores (%); local NVFP4 columns outlined. FLEURS Chinese uses CER; other speech rows use WER (lower is better). MMAU, MMAR, MMSU, and MMLU-Pro use accuracy (higher is better). Published columns are references, not matched local runs. — means unreported in the cited tables. Published MMAU splits are unspecified; our run uses test-mini.'
		}
	};

	export const agentText: AgentText = ({ props }) => {
		const data = suites[props.suite === 'ming3' ? 'ming3' : 'gemma4'];
		const headers = ['Dataset / Model', ...data.models];
		const rows = data.datasets.map((ds, r) => [ds, ...data.scores[r].map(fmt)]);
		return `${data.caption}\n\n${markdownTable(headers, rows)}`;
	};
</script>

<script lang="ts">
	let { suite = 'gemma4' }: { suite?: keyof typeof suites } = $props();
	const data = $derived(suites[suite]);

	// Green → red ramp in oklch. 0% WER → green, >25% WER → red, caps.
	function cellColor(w: number, row: number): string {
		const t = data.higherIsBetter.has(row) ? 1 - w / 100 : Math.min(1, w / 25);
		return `color-mix(in oklch, oklch(0.78 0.18 145) ${Math.round((1 - t) * 100)}%, oklch(0.62 0.22 25))`;
	}
</script>

<figure class="not-prose my-8 flex flex-col gap-3">
	<div class="overflow-x-auto">
		<table
			class="w-full border-separate border-spacing-1 font-mono text-xs"
			class:min-w-[36rem]={suite === 'ming3'}
		>
			<thead>
				<tr>
					<th scope="col" class="px-2 py-1 text-left font-sans font-normal text-text"
						>Dataset / Model</th
					>
					{#each data.models as m, i (m)}
						<th
							scope="col"
							class="px-2 py-1 text-center font-sans text-text {data.selfCols.has(i)
								? 'font-medium'
								: 'font-normal'}"
						>
							{m}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.datasets as ds, r (ds)}
					<tr>
						<th
							scope="row"
							class="px-2 py-1 text-left font-sans font-normal whitespace-nowrap text-text">{ds}</th
						>
						{#each data.scores[r] as v, c (c)}
							<td
								class="rounded-sm px-2 py-1.5 text-center tabular-nums {data.selfCols.has(c)
									? 'outline outline-1'
									: ''}"
								style:background-color={v === null ? 'var(--color-surface)' : cellColor(v, r)}
								style:color={v === null ? 'var(--color-text)' : '#000'}
								style:outline-color={data.selfCols.has(c) ? 'var(--color-text)' : undefined}
							>
								{fmt(v)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<figcaption class="text-sm leading-relaxed text-text/65">{data.caption}</figcaption>
</figure>
