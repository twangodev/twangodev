<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
</script>

<main class="flex flex-1 flex-col justify-center pb-24">
	<div class="max-w-xl">
		<h1 class="font-sans text-5xl font-semibold tracking-tight sm:text-6xl">James Ding</h1>

		<p class="mt-4 font-sans text-lg leading-relaxed text-text/80">
			Second-year student at UW–Madison studying computer science.
		</p>

		<div class="my-8 h-px w-48 bg-subtle"></div>

		<dl class="space-y-2.5 text-[15px]">
			<div class="flex items-baseline gap-3">
				<dt class="w-28 shrink-0 font-mono text-xs tracking-wider text-muted">[currently]</dt>
				<dd>
					founding engineer at
					<a
						href="https://fish.audio"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 underline decoration-subtle underline-offset-2 transition-colors hover:text-accent"
					>
						fish audio
						<ExternalLink size={12} strokeWidth={1.5} />
					</a>
				</dd>
			</div>
			<div class="flex items-baseline gap-3">
				<dt class="w-28 shrink-0 font-mono text-xs tracking-wider text-muted">[location]</dt>
				<dd>san francisco bay area / madison, wi</dd>
			</div>
			<div class="flex items-baseline gap-3">
				<dt class="w-28 shrink-0 font-mono text-xs tracking-wider text-muted">[interests]</dt>
				<dd>systems, web, open source</dd>
			</div>
		</dl>
	</div>
</main>