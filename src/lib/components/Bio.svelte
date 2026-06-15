<script lang="ts">
	import {
		Heading,
		Text,
		Divider,
		DetailList,
		DetailItem,
		Link,
		Tooltip
	} from '$lib/components/ui';
	import Handwriting from '$lib/components/ui/Handwriting.svelte';
	import { ArrowRight, Info } from '@lucide/svelte';
	import { flight } from '$lib/flight.svelte';
	import type { BioRouteHeading } from '$lib/bio.svelte';

	interface Props {
		compact?: boolean;
		heading?: string;
		headingRoute?: BioRouteHeading;
		description?: string;
		details?: { label: string; value: string; annotation?: string }[];
		handwriting?: string[];
	}

	let {
		compact = false,
		heading,
		headingRoute,
		description,
		details,
		handwriting
	}: Props = $props();

	const location = $derived(flight.location);
	const locationInfo = $derived(flight.locationInfo);
</script>

<Heading class={handwriting ? 'group' : undefined}>
	{#if headingRoute}
		<span class="inline-flex min-w-0 items-baseline gap-3">
			<span>{headingRoute.from}</span>
			<ArrowRight size={44} strokeWidth={2.1} class="shrink-0 translate-y-[7px] text-muted" />
			<span>{headingRoute.to}</span>
		</span>
	{:else}
		{heading ?? 'James Ding'}
	{/if}
	{#if handwriting}
		<Handwriting phrases={handwriting} class="ml-2 text-lg font-extralight text-muted sm:text-xl" />
	{/if}
</Heading>

{#snippet content()}
	<Text variant="body" size="lg" class="mt-4">
		{description ?? 'Second-year student at UW\u2013Madison studying computer science.'}
	</Text>
	<Divider />
	<DetailList>
		{#if details}
			{#each details as detail}
				<DetailItem label={detail.label}
					>{detail.value}{#if detail.annotation}
						<span class="ml-1 text-muted">{detail.annotation}</span>{/if}</DetailItem
				>
			{/each}
		{:else}
			<DetailItem label="currently">open sourcing & training</DetailItem>
			<DetailItem label="currently in"
				>{location}{#if locationInfo}<Tooltip text={locationInfo}
						><Info size={12} class="ml-1.5 inline translate-y-[0.5px] text-muted" /></Tooltip
					>{/if}</DetailItem
			>
			<DetailItem label="interests">systems, infra, open source</DetailItem>
		{/if}
	</DetailList>
{/snippet}

{#if compact}
	<div class="hidden md:contents">
		{@render content()}
	</div>
{:else}
	{@render content()}
{/if}
