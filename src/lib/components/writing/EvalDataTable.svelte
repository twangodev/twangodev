<script lang="ts">
	const datasets = [
		{
			label: 'AMI',
			slug: 'ami_test',
			license: 'CC BY 4.0',
			licenseUrl: 'https://groups.inf.ed.ac.uk/ami/corpus/license.shtml'
		},
		{
			label: 'Earnings22',
			slug: 'earnings22_test',
			license: 'CC BY-SA 4.0',
			licenseUrl: 'https://huggingface.co/datasets/revdotcom/earnings22'
		},
		{
			label: 'GigaSpeech',
			slug: 'gigaspeech_test',
			license: 'Apache 2.0',
			licenseUrl: 'https://github.com/SpeechColab/GigaSpeech'
		},
		{
			label: 'LS Clean',
			slug: 'librispeech_test.clean',
			license: 'CC BY 4.0',
			licenseUrl: 'https://www.openslr.org/12'
		},
		{
			label: 'LS Other',
			slug: 'librispeech_test.other',
			license: 'CC BY 4.0',
			licenseUrl: 'https://www.openslr.org/12'
		},
		{
			label: 'VoxPopuli',
			slug: 'voxpopuli_test',
			license: 'CC0',
			licenseUrl: 'https://github.com/facebookresearch/voxpopuli'
		}
	];

	function urls(model: 'E2B' | 'E4B', slug: string) {
		const base = `/data/gemma4-audio/eval_results/google_gemma-4-${model}-it__${slug}`;
		return { csv: `${base}/results.csv`, json: `${base}/results.json` };
	}

	const linkClass =
		'underline underline-offset-2 decoration-subtle hover:text-accent hover:decoration-accent';
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<figure class="not-prose my-8 flex flex-col gap-3">
	<div class="overflow-x-auto rounded-md border border-subtle">
		<table class="w-full font-mono text-xs">
			<thead class="bg-surface/40 text-muted">
				<tr>
					<th class="px-3 py-2 text-left font-normal">Dataset</th>
					<th class="px-3 py-2 text-left font-normal">E2B (2B)</th>
					<th class="px-3 py-2 text-left font-normal">E4B (4B)</th>
					<th class="px-3 py-2 text-left font-normal">Upstream license</th>
				</tr>
			</thead>
			<tbody>
				{#each datasets as ds (ds.slug)}
					{@const e2b = urls('E2B', ds.slug)}
					{@const e4b = urls('E4B', ds.slug)}
					<tr class="border-t border-subtle">
						<td class="px-3 py-2 text-text">{ds.label}</td>
						<td class="px-3 py-2">
							<a class={linkClass} href={e2b.csv} target="_blank" rel="noopener">csv</a>
							<span class="text-muted">·</span>
							<a class={linkClass} href={e2b.json} target="_blank" rel="noopener">json</a>
						</td>
						<td class="px-3 py-2">
							<a class={linkClass} href={e4b.csv} target="_blank" rel="noopener">csv</a>
							<span class="text-muted">·</span>
							<a class={linkClass} href={e4b.json} target="_blank" rel="noopener">json</a>
						</td>
						<td class="px-3 py-2">
							<a class={linkClass} href={ds.licenseUrl} target="_blank" rel="noopener"
								>{ds.license}</a
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<figcaption class="text-sm leading-relaxed text-muted">
		Per-sample metrics. CSV: one row per utterance with sample id, WER, CER, MER, WIL,
		substitutions/insertions/deletions, latency, RTFx, audio duration. JSON has the run config and
		corpus-level metrics. References and hypotheses are stripped to avoid redistributing upstream
		text; originals are recoverable by sample id from each dataset. SPGISpeech (Kensho
		research-only) and TED-LIUM (CC BY-NC-ND 3.0) are excluded from redistribution, but aggregate
		metrics from those runs still appear in the charts above.
	</figcaption>
</figure>
