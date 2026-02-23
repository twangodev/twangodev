<script lang="ts">
	import { page } from '$app/state';
	import { Heading, Text, Link } from '$lib/components/ui';

	const lines = 14;
</script>

<div class="flex flex-1 items-center gap-12">
	<!-- Content -->
	<div class="flex flex-col gap-6">
		<div>
			<p class="font-mono text-6xl tracking-tight text-muted sm:text-8xl">
				{page.status}
			</p>
			<Heading level={2} class="mt-2">{page.error?.message}</Heading>
		</div>
		<Text variant="body" size="sm">
			The page you're looking for doesn't exist or has been moved.
		</Text>
		<Link href="/" underline class="font-mono text-sm tracking-wider text-muted">
			&larr; back to home
		</Link>
	</div>

	<!-- Monospace cascade pattern -->
	<div class="hidden flex-1 items-center justify-center overflow-hidden select-none md:flex">
		<div class="flex flex-col gap-4 font-mono text-2xl tracking-widest text-muted">
			{#each { length: lines } as _, i (i)}
				{@const vertFade = 1 - Math.abs(i - lines / 2) / (lines / 2)}
				{@const opacity = vertFade * 0.14}
				<div
					class="whitespace-nowrap"
					style:opacity={Math.max(opacity, 0.03)}
					style:padding-left="{(lines - 1 - i) * 12}px"
				>
					{page.status} · {page.status} · {page.status}
				</div>
			{/each}
		</div>
	</div>
</div>
