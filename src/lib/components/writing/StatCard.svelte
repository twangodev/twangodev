<script lang="ts">
	interface Props {
		value: string;
		label: string;
		sublabel?: string;
		emphasis?: boolean;
		tilt?: 'left' | 'right' | 'none';
	}

	let { value, label, sublabel, emphasis = false, tilt = 'none' }: Props = $props();

	const tiltClass = $derived(tilt === 'left' ? '-rotate-1' : tilt === 'right' ? 'rotate-1' : '');
</script>

<div
	class="not-prose flex flex-col gap-1.5 rounded-sm border border-subtle bg-surface/40 px-4 py-3 transition-transform duration-200 hover:rotate-0 {tiltClass}"
>
	<div class="font-mono text-2xl leading-none font-semibold tracking-tight text-text tabular-nums">
		{value}
	</div>
	{#if emphasis}
		<svg
			class="h-1.5 w-16 text-text/60"
			viewBox="0 0 100 6"
			preserveAspectRatio="none"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		>
			<path d="M1 3 Q 12 0.5, 24 3 T 48 3 T 72 3 T 99 3" />
		</svg>
	{/if}
	<div class="font-mono text-sm leading-tight tracking-tight text-text/90">{label}</div>
	{#if sublabel}
		<div class="font-mono text-xs leading-tight tracking-wide text-muted">{sublabel}</div>
	{/if}
</div>
