<script module lang="ts">
	declare const __BUILD_TIME__: string;
</script>

<script lang="ts">
	const buildDate = new Date(__BUILD_TIME__);
	const buildStr = buildDate.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
</script>

<footer class="flex items-end justify-between font-mono text-xs tracking-wide text-muted">
	<div class="flex flex-col gap-3">
		<div class="flex items-baseline gap-2">
			<span class="text-lg font-semibold text-text">td.</span>
			<span>twango.dev</span>
		</div>
		<div class="flex items-center gap-3">
			<a
				href="https://github.com/twangodev/twangodev/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-accent"
			>AGPL-3.0</a>
			<span class="select-none">·</span>
			<span>built {buildStr}</span>
		</div>
	</div>
	<div class="flex flex-col items-end gap-3">
		<div class="flex items-center gap-3">
			<a
				href="https://github.com/twangodev"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-accent"
			>github</a>
			<span class="select-none">·</span>
			<a
				href="https://linkedin.com/in/jamesding365"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-accent"
			>linkedin</a>
			<span class="select-none">·</span>
			<a
				href="https://x.com/twangodev"
				target="_blank"
				rel="noopener noreferrer"
				class="transition-colors hover:text-accent"
			>x</a>
			<span class="select-none">·</span>
			<a href="mailto:james@twango.dev" class="transition-colors hover:text-accent">email</a>
		</div>
		<div class="flex items-center gap-3">
			<a
				href="https://status.twango.dev"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 transition-colors hover:text-accent"
			>
				<img
					src="https://kener.twango.dev/badge/_/dot?animate=ping"
					alt="Service status"
					class="h-3 w-3 translate-y-px sepia-[.2] saturate-[.7]"
				/>
				service status
			</a>
			<span class="select-none">·</span>
			<a href="/security" class="transition-colors hover:text-accent">security</a>
		</div>
	</div>
</footer>