<script lang="ts">
	import { format as timeago } from 'timeago.js';
	import NumberFlow from '@number-flow/svelte';
	import { flight } from '$lib/flight.svelte';

	const status = $derived(flight.status);

	function formatLocalTime(iso: string): string {
		return new Intl.DateTimeFormat(undefined, {
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		}).format(new Date(iso));
	}

	function formatRelative(iso: string, _tick: number): string {
		return timeago(iso);
	}
</script>

{#if status}
	<div
		class="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-1 font-mono text-xs text-muted sm:px-10 md:px-16"
		role="status"
		aria-live="polite"
	>
		<div class="min-w-0 flex-1 truncate">
			{#if status.kind === 'flying'}
				<span>currently flying</span>
				<span class="text-accent">{status.arc.fromIata}</span>
				<span>→</span>
				<span class="text-accent">{status.arc.toIata}</span>
				<span>·</span>
				<span class="text-text">
					<NumberFlow
						value={status.pct}
						format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
					/>%
				</span>
				<span>complete · arrives</span>
				<span class="text-text">{formatLocalTime(status.arc.arrUtc!)}</span>
				<span>({formatRelative(status.arc.arrUtc!, flight.now)})</span>
			{:else if status.kind === 'layover'}
				<span>on layover at</span>
				<span class="text-accent">{status.landedArc.toIata}</span>
				<span>· next flight to</span>
				<span class="text-accent">{status.nextArc.toIata}</span>
				<span>· departs</span>
				<span class="text-text">{formatLocalTime(status.nextArc.depUtc!)}</span>
				<span>({formatRelative(status.nextArc.depUtc!, flight.now)})</span>
			{:else}
				<span>upcoming</span>
				<span class="text-accent">{status.arc.fromIata}</span>
				<span>→</span>
				<span class="text-accent">{status.arc.toIata}</span>
				<span>· departs</span>
				<span class="text-text">{formatLocalTime(status.arc.depUtc!)}</span>
				<span>({formatRelative(status.arc.depUtc!, flight.now)})</span>
			{/if}
		</div>
		{#if status.kind === 'layover' ? status.nextArc.flightNumber : status.arc.flightNumber}
			<span class="shrink-0 tracking-widest text-muted italic"
				>{status.kind === 'layover' ? status.nextArc.flightNumber : status.arc.flightNumber}</span
			>
		{/if}
	</div>
{/if}